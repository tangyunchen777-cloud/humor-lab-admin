-- Additive migration for the existing Humor Lab database. No service-role key is used.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter table public.profiles add column if not exists is_superadmin boolean not null default false;
alter table public.generations add column if not exists deleted_at timestamptz;
alter table public.generations add column if not exists updated_at timestamptz not null default now();

-- A member may edit their names/photo, but never their privilege flag.
revoke update on public.profiles from authenticated;
grant update(first_name, last_name, avatar_path) on public.profiles to authenticated;

create or replace function private.is_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_superadmin
      and exists (select 1 from auth.identities i where i.user_id = p.id and i.provider = 'google')
      and exists (select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a where a->>'method' = 'oauth')
  );
$$;
revoke all on function private.is_superadmin() from public, anon;
grant execute on function private.is_superadmin() to authenticated;

create table private.admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  media_id uuid,
  action text not null check (action in ('create','update','delete','restore')),
  summary text not null,
  created_at timestamptz not null default now()
);
alter table private.admin_events enable row level security;
revoke all on private.admin_events from public, anon, authenticated;
create index admin_events_created_at_idx on private.admin_events(created_at desc);
create index admin_events_actor_id_idx on private.admin_events(actor_id);
create index if not exists generations_creator_id_idx on public.generations(creator_id);
create index if not exists votes_user_id_idx on public.votes(user_id);

-- Deletion is recoverable. The existing public app automatically stops seeing deleted media.
drop policy if exists "Anyone can read generations" on public.generations;
create policy "Anyone can read generations" on public.generations for select to anon, authenticated
  using (deleted_at is null);

-- Direct Data API writes must obey the same availability rule as the voting RPC.
drop policy if exists "Members cast own votes" on public.votes;
create policy "Members cast own votes" on public.votes for insert to authenticated
  with check ((select auth.uid())=user_id and exists (
    select 1 from public.generations g where g.id=generation_id and g.deleted_at is null
  ));
drop policy if exists "Members change own votes" on public.votes;
create policy "Members change own votes" on public.votes for update to authenticated
  using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id and exists (
    select 1 from public.generations g where g.id=generation_id and g.deleted_at is null
  ));

create or replace function public.generation_vote_summary()
returns table (generation_id uuid, upvotes bigint, downvotes bigint, score bigint, my_vote smallint)
language sql stable security definer set search_path = '' as $$
  select g.id, count(v.id) filter (where v.value=1)::bigint,
    count(v.id) filter (where v.value=-1)::bigint, coalesce(sum(v.value),0)::bigint,
    max(v.value) filter (where v.user_id=(select auth.uid()))::smallint
  from public.generations g left join public.votes v on v.generation_id=g.id
  where g.deleted_at is null group by g.id;
$$;
revoke all on function public.generation_vote_summary() from public;
grant execute on function public.generation_vote_summary() to anon, authenticated;

create or replace function public.cast_vote(target_generation_id uuid, new_value smallint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Sign in to vote' using errcode='42501'; end if;
  if new_value not in (-1,1) or new_value is null then raise exception 'Invalid vote'; end if;
  if not exists(select 1 from public.generations where id=target_generation_id and deleted_at is null) then
    raise exception 'This caption is not available';
  end if;
  insert into public.votes(generation_id,user_id,value) values(target_generation_id,(select auth.uid()),new_value)
  on conflict(generation_id,user_id) do update set value=excluded.value,updated_at=now();
end;
$$;
revoke all on function public.cast_vote(uuid,smallint) from public;
grant execute on function public.cast_vote(uuid,smallint) to authenticated;

create or replace function private.admin_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_superadmin() then raise exception 'Superadmin access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'profiles',(select count(*) from public.profiles),
      'media',(select count(*) from public.generations where deleted_at is null),
      'deleted',(select count(*) from public.generations where deleted_at is not null),
      'votes',(select count(*) from public.votes v join public.generations g on g.id=v.generation_id where g.deleted_at is null),
      'upvotes',(select count(*) from public.votes v join public.generations g on g.id=v.generation_id where g.deleted_at is null and v.value=1),
      'downvotes',(select count(*) from public.votes v join public.generations g on g.id=v.generation_id where g.deleted_at is null and v.value=-1),
      'unrated',(select count(*) from public.generations g where deleted_at is null and not exists(select 1 from public.votes v where v.generation_id=g.id)),
      'active_voters',(select count(distinct v.user_id) from public.votes v join public.generations g on g.id=v.generation_id where g.deleted_at is null and v.updated_at>=now()-interval '7 days'),
      'new_media',(select count(*) from public.generations where deleted_at is null and created_at>=now()-interval '7 days')
    ),
    'profiles',coalesce((select jsonb_agg(to_jsonb(p)) from (
      select p.id,p.first_name,p.last_name,p.is_superadmin,p.created_at,u.email,u.last_sign_in_at,
        (select count(*) from public.generations g where g.creator_id=p.id and g.deleted_at is null) as media_count,
        (select count(*) from public.votes v where v.user_id=p.id) as vote_count
      from public.profiles p join auth.users u on u.id=p.id order by p.created_at desc limit 1000
    ) p),'[]'::jsonb),
    'media',coalesce((select jsonb_agg(to_jsonb(m)) from (
      select g.*,coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Unnamed member') as creator_name,
        (select count(*) from public.votes v where v.generation_id=g.id and value=1) as upvotes,
        (select count(*) from public.votes v where v.generation_id=g.id and value=-1) as downvotes
      from public.generations g left join public.profiles p on p.id=g.creator_id
      order by g.created_at desc limit 1000
    ) m),'[]'::jsonb),
    'votes',coalesce((select jsonb_agg(to_jsonb(v)) from (
      select v.id,v.generation_id,v.user_id,v.value,v.created_at,v.updated_at,g.caption,g.deleted_at,
        coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Unnamed member') as voter_name
      from public.votes v join public.generations g on g.id=v.generation_id left join public.profiles p on p.id=v.user_id
      order by v.updated_at desc limit 1000
    ) v),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from (
      select to_char(day,'YYYY-MM-DD') as day,
        (select count(*) from public.generations g where g.deleted_at is null and (g.created_at at time zone 'UTC')::date=day::date) as media,
        (select count(*) from public.votes v join public.generations g on g.id=v.generation_id where g.deleted_at is null and (v.created_at at time zone 'UTC')::date=day::date) as votes
      from generate_series((now() at time zone 'UTC')::date-13,(now() at time zone 'UTC')::date,interval '1 day') day
    ) d),'[]'::jsonb),
    'styles',coalesce((select jsonb_agg(to_jsonb(s)) from (
      select g.style,count(distinct g.id) as count,count(v.id) filter(where value=1) as upvotes,
        count(v.id) filter(where value=-1) as downvotes
      from public.generations g left join public.votes v on v.generation_id=g.id
      where g.deleted_at is null group by g.style
    ) s),'[]'::jsonb),
    'activity',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select e.*,coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Admin') as actor_name
      from private.admin_events e left join public.profiles p on p.id=e.actor_id order by e.created_at desc limit 100
    ) e),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function private.admin_snapshot() from public, anon;
grant execute on function private.admin_snapshot() to authenticated;

create or replace function public.admin_snapshot()
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.admin_snapshot(); $$;
revoke all on function public.admin_snapshot() from public, anon;
grant execute on function public.admin_snapshot() to authenticated;

create or replace function private.admin_save_media(
  media_id uuid, new_scene text, new_prompt text, new_caption text, new_style text, new_model text,
  expected_updated_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if not private.is_superadmin() then raise exception 'Superadmin access required' using errcode='42501'; end if;
  if media_id is null then
    insert into public.generations(creator_id,scene,prompt,caption,style,model)
    values((select auth.uid()),trim(new_scene),trim(new_prompt),trim(new_caption),new_style,trim(new_model)) returning id into saved_id;
  else
    update public.generations set scene=trim(new_scene),prompt=trim(new_prompt),caption=trim(new_caption),
      style=new_style,model=trim(new_model),updated_at=now()
    where id=media_id and deleted_at is null and updated_at=expected_updated_at returning id into saved_id;
    if saved_id is null then raise exception 'This record changed. Refresh before saving.'; end if;
  end if;
  insert into private.admin_events(actor_id,media_id,action,summary)
    values((select auth.uid()),saved_id,case when media_id is null then 'create' else 'update' end,left(trim(new_caption),180));
  return saved_id;
end;
$$;
revoke all on function private.admin_save_media(uuid,text,text,text,text,text,timestamptz) from public, anon;
grant execute on function private.admin_save_media(uuid,text,text,text,text,text,timestamptz) to authenticated;
create or replace function public.admin_save_media(
  media_id uuid, new_scene text, new_prompt text, new_caption text, new_style text, new_model text,
  expected_updated_at timestamptz default null
) returns uuid language sql security invoker set search_path = '' as $$
  select private.admin_save_media(media_id,new_scene,new_prompt,new_caption,new_style,new_model,expected_updated_at);
$$;
revoke all on function public.admin_save_media(uuid,text,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.admin_save_media(uuid,text,text,text,text,text,timestamptz) to authenticated;

create or replace function private.admin_delete_media(media_id uuid, restore boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare caption_text text;
begin
  if not private.is_superadmin() then raise exception 'Superadmin access required' using errcode='42501'; end if;
  update public.generations set deleted_at=case when restore then null else now() end,updated_at=now()
  where id=media_id and ((restore and deleted_at is not null) or (not restore and deleted_at is null))
  returning caption into caption_text;
  if caption_text is null then raise exception 'This record has already changed. Refresh the page.'; end if;
  insert into private.admin_events(actor_id,media_id,action,summary)
    values((select auth.uid()),media_id,case when restore then 'restore' else 'delete' end,left(caption_text,180));
end;
$$;
revoke all on function private.admin_delete_media(uuid,boolean) from public, anon;
grant execute on function private.admin_delete_media(uuid,boolean) to authenticated;
create or replace function public.admin_delete_media(media_id uuid, restore boolean default false)
returns void language sql security invoker set search_path = '' as $$ select private.admin_delete_media(media_id,restore); $$;
revoke all on function public.admin_delete_media(uuid,boolean) from public, anon;
grant execute on function public.admin_delete_media(uuid,boolean) to authenticated;

-- Every exposed application table must continue to use RLS.
alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.votes enable row level security;
commit;
