-- Run as database owner. No fixtures or permission changes survive rollback.
begin;
select set_config('app.test_admin_id',(select p.id::text from public.profiles p where p.is_superadmin and exists(select 1 from auth.identities i where i.user_id=p.id and i.provider='google') limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.test_admin_id'),'role','authenticated','amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text,true);
set local role authenticated;
do $crud$
declare t text; v jsonb; rid uuid; provider uuid; version timestamptz; n integer; chain uuid; mixid uuid;
begin
 insert into public.llm_providers(name,family) values('Rollback test provider','other') returning id into provider;
 foreach t in array array['terms','generation_examples','llm_models','allowed_signup_domains','whitelisted_emails','images'] loop
  v:=case t
    when 'terms' then '{"term":"Rollback term","definition":"Temporary definition","category":"Test"}'::jsonb
    when 'generation_examples' then '{"scene":"An entirely fictional test scene","prompt":"A temporary original generation prompt","caption":"Temporary caption","style":"witty","model":"test-model"}'::jsonb
    when 'llm_models' then jsonb_build_object('provider_id',provider,'name','Rollback model','model_key','rollback-test','priority',10,'enabled',true)
    when 'allowed_signup_domains' then '{"domain":"rollback-test.invalid","notes":"Test"}'::jsonb
    when 'whitelisted_emails' then '{"email":"rollback@example.invalid","notes":"Test"}'::jsonb
    when 'images' then jsonb_build_object('storage_path',auth.uid()::text||'/'||gen_random_uuid()::text||'.png','alt_text','Rollback image','creator_id',auth.uid())
  end;
  -- Explicit, allow-listed table names only. PostgreSQL validates each row's fields.
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, (select to_jsonb(d)||$1 from (select gen_random_uuid() id,now() created_at,now() updated_at) d)) returning id,updated_at',t,t)
    into rid,version using v;
  execute format('update public.%I set deleted_at=now() where id=$1 and updated_at=$2',t) using rid,version;
  get diagnostics n=row_count;if n<>1 then raise exception 'Archive failed for %',t;end if;
  execute format('update public.%I set deleted_at=null where id=$1',t) using rid;
  execute format('update public.%I set deleted_at=now() where id=$1 and updated_at=$2',t) using rid,version;
  get diagnostics n=row_count;if n<>0 then raise exception 'Stale edit accepted for %',t;end if;
 end loop;
 update public.llm_providers set notes='Edited provider',deleted_at=now() where id=provider;
 update public.llm_providers set deleted_at=null where id=provider;
 if not exists(select 1 from public.prompt_chains) or not exists(select 1 from public.prompt_chain_steps) then raise exception 'Pipeline is empty';end if;
 select id into mixid from public.prompt_chain_mix limit 1;
 update public.prompt_chain_mix set weight=75 where id=mixid;
 if not exists(select 1 from public.prompt_chain_mix where id=mixid and weight=75) then raise exception 'Mix update failed';end if;
end $crud$;
reset role;

update public.profiles set is_superadmin=false where id=current_setting('app.test_admin_id')::uuid;
set local role authenticated;
do $member$
declare t text;n integer;config jsonb;rid uuid;gid uuid;
begin
 foreach t in array array['terms','generation_examples','llm_models','llm_providers','allowed_signup_domains','whitelisted_emails','images','prompt_chains','prompt_chain_steps','prompt_chain_mix','generation_requests','llm_responses'] loop
  execute format('select count(*) from public.%I',t) into n;
  if n<>0 then raise exception 'Non-admin read %',t;end if;
 end loop;
 begin insert into public.terms(term,definition) values('Forbidden','Forbidden');raise exception 'Non-admin edited terms';exception when insufficient_privilege then null;end;
 config:=public.begin_generation('A fictional campus test scene','Write one original witty caption about a fictional campus scene.','witty',false);
 rid:=(config->>'request_id')::uuid;
 if config->>'prompt' is null or jsonb_array_length(config->'models')=0 then raise exception 'Incomplete runtime config';end if;
 perform public.record_llm_response(rid,jsonb_build_object('model_id',config->'models'->0->>'id','model_key',config->'models'->0->>'key','attempt',1,'http_status',200,'success',true,'output_text','A rollback-only caption','latency_ms',123));
 perform public.finish_generation(rid,true,null);
 begin perform public.finish_generation(gen_random_uuid(),false,'Forbidden');raise exception 'Member modified another request';exception when insufficient_privilege then null;end;
 insert into public.generations(creator_id,scene,prompt,caption,style,model,generation_request_id)
 values(auth.uid(),'A fictional campus test scene','Write one original fictional campus test caption.','A rollback-only caption','witty','test-model',rid) returning id into gid;
 if exists(select 1 from public.generation_requests where id=rid) then raise exception 'Member could read internal telemetry';end if;
end $member$;
reset role;
update public.profiles set is_superadmin=true where id=current_setting('app.test_admin_id')::uuid;
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.generation_requests r join public.llm_responses s on s.request_id=r.id where r.source='live' and r.generation_id is not null and s.output_text='A rollback-only caption') then raise exception 'Owner cannot inspect completed trace';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $anon$ declare t text;begin
 foreach t in array array['terms','generation_examples','llm_models','llm_providers','allowed_signup_domains','whitelisted_emails','images','prompt_chains','prompt_chain_steps','prompt_chain_mix','generation_requests','llm_responses'] loop
  begin execute format('select 1 from public.%I limit 1',t);raise exception 'Anonymous read %',t;exception when insufficient_privilege then null;end;
 end loop;
 begin perform public.begin_generation('A fictional test scene','A fictional original caption prompt.','witty',false);raise exception 'Anonymous started generation';exception when insufficient_privilege then null;end;
end $anon$;
reset role;
rollback;
select 'PASS: catalog CRUD, archive/restore, stale edits, mix update, non-admin/anonymous denial, own-request logging and publication link. All changes rolled back.' as result;
