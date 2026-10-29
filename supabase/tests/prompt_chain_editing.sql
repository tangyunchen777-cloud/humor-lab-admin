-- Run as the database owner. All chain edits, roles, and requests roll back.
begin;
select set_config('app.chain_test_user',(select p.id::text from public.profiles p where p.is_superadmin
  and exists(select 1 from auth.identities i where i.user_id=p.id and i.provider='google') limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.chain_test_user'),
  'role','authenticated','amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text,true);
set local role authenticated;
do $$
declare c public.prompt_chains; payload jsonb; saved timestamptz; first_step uuid; config jsonb;
  historical_id uuid; historical_prompt text; other_step uuid;
begin
  select * into c from public.prompt_chains where style='witty' order by created_at limit 1;
  select id,prompt into historical_id,historical_prompt from public.generation_requests order by created_at limit 1;
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'instruction',
    'Editable chain verification marker. '||instruction) order by position desc)
    into payload from public.prompt_chain_steps where chain_id=c.id;
  first_step := (payload->0->>'id')::uuid;
  saved := public.admin_save_prompt_chain(c.id,c.updated_at,'Edited test chain','Edited test description',payload);
  if saved=c.updated_at or not exists(select 1 from public.prompt_chains where id=c.id and name='Edited test chain')
    or not exists(select 1 from public.prompt_chain_steps where id=first_step and position=1
      and instruction like 'Editable chain verification marker.%') then
    raise exception 'Atomic chain editing or reordering failed';
  end if;
  if historical_id is not null and (select prompt from public.generation_requests where id=historical_id) is distinct from historical_prompt then
    raise exception 'An existing prompt snapshot changed';
  end if;
  begin
    perform public.admin_save_prompt_chain(c.id,c.updated_at,'Stale edit','Stale description',payload);
    raise exception 'Stale edit was accepted';
  exception when serialization_failure then null;
  end;
  begin
    perform public.admin_save_prompt_chain(c.id,saved,'Invalid edit','Invalid description','[]'::jsonb);
    raise exception 'Missing steps were accepted';
  exception when invalid_parameter_value then null;
  end;
  select id into other_step from public.prompt_chain_steps where chain_id<>c.id limit 1;
  begin
    perform public.admin_save_prompt_chain(c.id,saved,'Invalid edit','Invalid description',
      jsonb_set(payload,'{0,id}',to_jsonb(other_step::text)));
    raise exception 'A step from another chain was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.prompt_chains set name='Direct bypass' where id=c.id;
    raise exception 'Direct table update bypassed the atomic editor';
  exception when insufficient_privilege then null;
  end;
  if (select updated_at from public.prompt_chains where id=c.id) is distinct from saved then
    raise exception 'Rejected edit partially changed the chain';
  end if;
  update public.prompt_chain_mix set weight=0 where chain_id in
    (select id from public.prompt_chains where style='witty' and id<>c.id);
  config := public.begin_generation('A fictional campus test scene','Write an original fictional test caption.','witty',false);
  if config->>'chain_id'<>c.id::text or position('Editable chain verification marker.' in config->>'prompt')=0 then
    raise exception 'New requests did not use the edited instructions';
  end if;
end $$;
reset role;
update public.profiles set is_superadmin=false where id=current_setting('app.chain_test_user')::uuid;
set local role authenticated;
do $$ begin
  begin
    perform public.admin_save_prompt_chain(gen_random_uuid(),now(),'Forbidden','Forbidden','[]'::jsonb);
    raise exception 'Member edited a prompt chain';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.admin_save_prompt_chain(gen_random_uuid(),now(),'Forbidden','Forbidden','[]'::jsonb);
    raise exception 'Member called the private implementation';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  begin
    perform public.admin_save_prompt_chain(gen_random_uuid(),now(),'Forbidden','Forbidden','[]'::jsonb);
    raise exception 'Anonymous visitor edited a prompt chain';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: atomic chain edits, reorder, stale/invalid/cross-chain rejection, prompt snapshot preservation, runtime integration, and non-admin/anonymous denial. All changes rolled back.' as result;
