-- The generations SELECT policy already hides archived captions. Members have
-- column-level access to public media fields, not the internal deleted_at field.
-- Check visibility through RLS instead of directly selecting that private field.
begin;

alter policy "Members cast own votes" on public.votes
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.generations g where g.id = generation_id
  ));

alter policy "Members change own votes" on public.votes
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.generations g where g.id = generation_id
  ));

create or replace function public.cast_vote(target_generation_id uuid, new_value smallint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to vote' using errcode = '42501';
  end if;
  if new_value not in (-1, 1) or new_value is null then
    raise exception 'Invalid vote';
  end if;
  if not exists (select 1 from public.generations where id = target_generation_id) then
    raise exception 'This caption is not available';
  end if;
  insert into public.votes(generation_id, user_id, value)
  values (target_generation_id, (select auth.uid()), new_value)
  on conflict (generation_id, user_id)
  do update set value = excluded.value, updated_at = now();
end;
$$;
revoke all on function public.cast_vote(uuid, smallint) from public;
grant execute on function public.cast_vote(uuid, smallint) to authenticated;

commit;
