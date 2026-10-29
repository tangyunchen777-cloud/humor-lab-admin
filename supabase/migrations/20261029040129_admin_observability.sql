-- Week 7. Additive changes to Humor Lab, not the semester teaching copy.
begin;
create table public.llm_providers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 family text not null default 'google' check(family in ('google','other')), notes text not null default '',
 enabled boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.llm_models (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.llm_providers(id),
 name text not null check(length(name) between 1 and 120), model_key text not null check(model_key ~ '^[a-zA-Z0-9._-]{1,100}$'),
 priority integer not null default 10 check(priority between 0 and 1000), enabled boolean not null default true,
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index llm_models_active_key on public.llm_models(model_key) where deleted_at is null;
create index on public.llm_models(provider_id);
create table public.prompt_chains (
 id uuid primary key default gen_random_uuid(), name text not null, style text not null check(style in ('witty','deadpan','absurd')),
 description text not null, created_at timestamptz not null default now()
);
create table public.prompt_chain_steps (
 id uuid primary key default gen_random_uuid(), chain_id uuid not null references public.prompt_chains(id),
 position integer not null check(position>0), name text not null, instruction text not null,
 unique(chain_id,position)
);
create table public.prompt_chain_mix (
 id uuid primary key default gen_random_uuid(), chain_id uuid not null unique references public.prompt_chains(id),
 weight integer not null default 50 check(weight between 0 and 1000), updated_at timestamptz not null default now()
);
create table public.terms (
 id uuid primary key default gen_random_uuid(), term text not null check(length(term) between 1 and 80),
 definition text not null check(length(definition) between 1 and 800), category text not null default 'Campus',
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.generation_examples (
 id uuid primary key default gen_random_uuid(), scene text not null check(length(scene) between 1 and 500),
 prompt text not null check(length(prompt) between 1 and 2000), caption text not null check(length(caption) between 1 and 280),
 style text not null check(style in ('witty','deadpan','absurd')), model text not null check(length(model) between 1 and 100),
 source_generation_id uuid references public.generations(id),
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.generation_examples(source_generation_id);
create table public.allowed_signup_domains (
 id uuid primary key default gen_random_uuid(), domain text not null check(domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$'),
 notes text not null default '', deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index allowed_domains_active on public.allowed_signup_domains(lower(domain)) where deleted_at is null;
create table public.whitelisted_emails (
 id uuid primary key default gen_random_uuid(), email text not null check(email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 notes text not null default '', deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index whitelist_active on public.whitelisted_emails(lower(email)) where deleted_at is null;
create table public.images (
 id uuid primary key default gen_random_uuid(), storage_path text not null unique check(storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
 alt_text text not null check(length(alt_text) between 1 and 500), creator_id uuid references auth.users(id),
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.images(creator_id);
create table public.generation_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), chain_id uuid references public.prompt_chains(id),
 style text not null, scene text not null, prompt text not null, has_image boolean not null default false,
 status text not null check(status in ('pending','succeeded','failed')), source text not null default 'live' check(source in ('live','published_history')),
 error_message text, generation_id uuid references public.generations(id), created_at timestamptz not null default now(), completed_at timestamptz
);
create index on public.generation_requests(user_id,created_at desc);
create index on public.generation_requests(chain_id);
create index on public.generation_requests(generation_id);
create table public.llm_responses (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.generation_requests(id),
 model_id uuid references public.llm_models(id), model_key text not null, attempt integer not null check(attempt>0),
 http_status integer, success boolean not null, output_text text not null default '', error_message text,
 latency_ms integer check(latency_ms>=0), input_tokens integer, output_tokens integer, created_at timestamptz not null default now()
);
create index on public.llm_responses(request_id);
create index on public.llm_responses(model_id);

-- The application never receives a service key. Administrator access is checked live by RLS.
do $policies$ declare t text; begin
 foreach t in array array['llm_providers','llm_models','terms','generation_examples','allowed_signup_domains','whitelisted_emails','images'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to authenticated',t);
  execute format('create policy admin_catalog on public.%I for all to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()))',t);
 end loop;
 foreach t in array array['prompt_chains','prompt_chain_steps','generation_requests','llm_responses'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy admin_read on public.%I for select to authenticated using ((select private.is_superadmin()))',t);
 end loop;
end $policies$;
alter table public.prompt_chain_mix enable row level security;
revoke all on public.prompt_chain_mix from public,anon,authenticated;
grant select,update(weight) on public.prompt_chain_mix to authenticated;
create policy admin_mix on public.prompt_chain_mix to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()));

-- Atomic version checks and audit entries for all catalog mutations.
create function private.catalog_before_write() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then new.updated_at := clock_timestamp(); end if;
 return new;
end; $$;
revoke all on function private.catalog_before_write() from public;
create function private.catalog_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if private.is_superadmin() then
  insert into private.admin_events(actor_id,media_id,action,summary) values(auth.uid(),new.id,
   case when tg_op='INSERT' then 'create' when to_jsonb(new)->>'deleted_at' is not null and to_jsonb(old)->>'deleted_at' is null then 'delete'
    when to_jsonb(old)->>'deleted_at' is not null and to_jsonb(new)->>'deleted_at' is null then 'restore' else 'update' end,
   tg_table_name || ': ' || left(coalesce(to_jsonb(new)->>'name',to_jsonb(new)->>'term',to_jsonb(new)->>'domain',to_jsonb(new)->>'email',new.id::text),120));
 end if;
 return new;
end; $$;
revoke all on function private.catalog_audit() from public;
do $$ declare t text; begin
 foreach t in array array['llm_providers','llm_models','terms','generation_examples','allowed_signup_domains','whitelisted_emails','images','prompt_chain_mix'] loop
  execute format('create trigger catalog_timestamp before update on public.%I for each row execute function private.catalog_before_write()',t);
  execute format('create trigger catalog_audit after insert or update on public.%I for each row execute function private.catalog_audit()',t);
 end loop;
end $$;
create function private.validate_mix() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 -- Serialize concurrent edits to a style before checking its remaining weight.
 perform pg_advisory_xact_lock(hashtext((select style from public.prompt_chains where id=new.chain_id)));
 if new.weight=0 and not exists(select 1 from public.prompt_chain_mix m join public.prompt_chains c on c.id=m.chain_id
  where c.style=(select style from public.prompt_chains where id=new.chain_id) and m.id<>new.id and m.weight>0) then
  raise exception 'Keep at least one positive weight for each humor style';
 end if;
 return new;
end $$;
revoke all on function private.validate_mix() from public;
create trigger validate_mix before update on public.prompt_chain_mix for each row execute function private.validate_mix();

-- Register existing published images; future public-app publishes register automatically.
insert into public.images(storage_path,alt_text,creator_id)
select distinct on (image_path) image_path,scene,creator_id from public.generations where image_path is not null order by image_path,created_at desc;
create function private.register_generation_image() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.image_path is not null then
  insert into public.images(storage_path,alt_text,creator_id) values(new.image_path,new.scene,new.creator_id) on conflict(storage_path) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.register_generation_image() from public;
create trigger register_generation_image after insert on public.generations for each row execute function private.register_generation_image();

-- This registry stores public configuration, never provider API keys or passwords.
insert into public.llm_providers(id,name,family,notes) values('70000000-0000-4000-8000-000000000001','Google AI','google','API key stays in the rating app server environment.');
insert into public.llm_models(provider_id,name,model_key,priority) values
 ('70000000-0000-4000-8000-000000000001','Gemini Flash Lite Preview','gemini-3.1-flash-lite-preview',10),
 ('70000000-0000-4000-8000-000000000001','Gemini Flash Lite','gemini-3.1-flash-lite',20),
 ('70000000-0000-4000-8000-000000000001','Gemma','gemma-4-26b-a4b-it',30);
insert into public.prompt_chains(name,style,description)
select initcap(s)||' · '||v,s,'Ordered instructions compiled into one caption request. '||case when v='Campus contrast' then 'Find the unexpected campus-life contrast.' else 'Describe the scene with a surprising comparison.' end
from unnest(array['witty','deadpan','absurd']) s cross join unnest(array['Campus contrast','Unexpected comparison']) v;
insert into public.prompt_chain_steps(chain_id,position,name,instruction)
select id,1,'Read the moment','Identify the visible or described situation. Do not invent personal details.' from public.prompt_chains
union all select id,2,'Find the punchline',case when name like '%Campus contrast' then 'Turn a recognizable college frustration into a short '||style||' contrast.' else 'Use an unexpected, '||style||' comparison that fits the actual scene.' end from public.prompt_chains;
insert into public.prompt_chain_mix(chain_id,weight) select id,50 from public.prompt_chains;
insert into public.terms(term,definition,category) values
 ('Butler','Columbia University library, often associated with late study sessions.','Campus'),
 ('Dining points','A finite campus food budget that never seems to last.','Campus');
insert into public.generation_examples(scene,prompt,caption,style,model,source_generation_id)
select scene,prompt,caption,style,model,id from public.generations where deleted_at is null order by created_at desc limit 3;
insert into public.allowed_signup_domains(domain,notes) values
 ('columbia.edu','Managed signup-domain registry; existing Google login remains open.'),
 ('gmail.com','Registry entry, not an enforced login restriction.');
insert into public.whitelisted_emails(email,notes) values('igi2001@columbia.edu','Professor; existing superadmin permission is managed separately.');

-- Historical outputs are real published records, explicitly distinguished from live telemetry.
insert into public.generation_requests(user_id,style,scene,prompt,has_image,status,source,generation_id,created_at,completed_at)
select creator_id,style,scene,prompt,image_path is not null,'succeeded','published_history',id,created_at,created_at from public.generations;
insert into public.llm_responses(request_id,model_id,model_key,attempt,success,output_text)
select r.id,m.id,g.model,1,true,g.caption from public.generation_requests r join public.generations g on g.id=r.generation_id
left join public.llm_models m on m.model_key=g.model;

-- Member RPCs only manage the caller's own request. All configuration stays admin-only.
create function private.begin_generation(request_scene text,request_prompt text,request_style text,request_has_image boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare chain public.prompt_chains; rid uuid; compiled text; models jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then raise insufficient_privilege; end if;
 if request_style not in ('witty','deadpan','absurd') or length(request_scene) not between 1 and 500 or length(request_prompt) not between 1 and 2000 then raise exception 'Invalid generation input'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.generation_requests where user_id=auth.uid() and source='live' and created_at>now()-interval '1 hour')>=8 then raise exception 'Hourly generation limit reached'; end if;
 select c.* into chain from public.prompt_chains c join public.prompt_chain_mix m on m.chain_id=c.id
 where c.style=request_style and m.weight>0 order by -ln(greatest(random(),0.000001))/m.weight limit 1;
 if chain.id is null then raise exception 'No active prompt chain for this style'; end if;
 select jsonb_agg(jsonb_build_object('id',m.id,'key',m.model_key) order by m.priority,m.model_key) into models
 from public.llm_models m join public.llm_providers p on p.id=m.provider_id
 where m.enabled and m.deleted_at is null and p.enabled and p.deleted_at is null and p.family='google';
 if models is null then raise exception 'No active Google model is configured'; end if;
 compiled := (select string_agg(instruction,E'\n' order by position) from public.prompt_chain_steps where chain_id=chain.id)||E'\n'||request_prompt;
 compiled := compiled || E'\nCampus vocabulary:\n'||coalesce((select string_agg(term||': '||definition,E'\n') from (select term,definition from public.terms where deleted_at is null order by created_at limit 3) t),'');
 compiled := compiled || E'\nStyle examples (reference only; write an original caption):\n'||coalesce((select string_agg(scene||' -> '||caption,E'\n') from (select scene,caption from public.generation_examples where deleted_at is null and style=request_style order by created_at desc limit 2) e),'');
 insert into public.generation_requests(user_id,chain_id,style,scene,prompt,has_image,status)
 values(auth.uid(),chain.id,request_style,request_scene,compiled,request_has_image,'pending') returning id into rid;
 return jsonb_build_object('request_id',rid,'chain_id',chain.id,'prompt',compiled,'models',models);
end $$;
create function public.begin_generation(request_scene text,request_prompt text,request_style text,request_has_image boolean)
returns jsonb language sql security invoker set search_path='' as $$ select private.begin_generation(request_scene,request_prompt,request_style,request_has_image); $$;

create function private.record_llm_response(request_uuid uuid,response_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.generation_requests where id=request_uuid and user_id=auth.uid() and status='pending') then raise insufficient_privilege; end if;
 if (select count(*) from public.llm_responses where request_id=request_uuid)>=20 then raise exception 'Attempt limit reached'; end if;
 insert into public.llm_responses(request_id,model_id,model_key,attempt,http_status,success,output_text,error_message,latency_ms,input_tokens,output_tokens)
 values(request_uuid,(select id from public.llm_models where id=(response_data->>'model_id')::uuid),left(response_data->>'model_key',100),
 (response_data->>'attempt')::integer,(response_data->>'http_status')::integer,(response_data->>'success')::boolean,left(coalesce(response_data->>'output_text',''),2000),
 left(response_data->>'error_message',500),(response_data->>'latency_ms')::integer,(response_data->>'input_tokens')::integer,(response_data->>'output_tokens')::integer);
end $$;
create function public.record_llm_response(request_uuid uuid,response_data jsonb) returns void language sql security invoker set search_path='' as $$ select private.record_llm_response(request_uuid,response_data); $$;
create function private.finish_generation(request_uuid uuid,request_success boolean,failure_message text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 update public.generation_requests set status=case when request_success then 'succeeded' else 'failed' end,error_message=left(failure_message,500),completed_at=clock_timestamp()
 where id=request_uuid and user_id=auth.uid() and status='pending';
 if not found then raise insufficient_privilege; end if;
end $$;
create function public.finish_generation(request_uuid uuid,request_success boolean,failure_message text) returns void language sql security invoker set search_path='' as $$ select private.finish_generation(request_uuid,request_success,failure_message); $$;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('private','public') and p.proname in ('begin_generation','record_llm_response','finish_generation') loop
  execute format('revoke all on function %s from public,anon',f.signature);
  execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
select pg_notify('pgrst','reload schema');
commit;
