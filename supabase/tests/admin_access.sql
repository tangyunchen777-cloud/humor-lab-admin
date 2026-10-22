-- Run as the database owner in SQL Editor. All test edits and records roll back.
begin;
select set_config('app.test_admin_id',(select p.id::text from public.profiles p where p.is_superadmin and exists(select 1 from auth.identities i where i.user_id=p.id and i.provider='google') limit 1),true);
do $$ begin if nullif(current_setting('app.test_admin_id',true),'') is null then raise exception 'Bootstrap a Google superadmin first'; end if; end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.test_admin_id'),'role','authenticated','amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text,true);

-- Turn this profile into a regular member inside this transaction only.
update public.profiles set is_superadmin=false where id=current_setting('app.test_admin_id')::uuid;
set local role authenticated;
do $$ begin
  if private.is_superadmin() then raise exception 'Non-admin passed the role check'; end if;
  begin perform public.admin_snapshot(); raise exception 'Non-admin read admin data'; exception when insufficient_privilege then null; end;
  begin perform public.admin_save_media(null,'A sufficiently long scene','A sufficiently long test prompt','Test caption','witty','test-model',null); raise exception 'Non-admin created admin media'; exception when insufficient_privilege then null; end;
  begin perform public.admin_delete_media(gen_random_uuid(),false); raise exception 'Non-admin deleted admin media'; exception when insufficient_privilege then null; end;
  begin update public.profiles set is_superadmin=true where id=(select auth.uid()); raise exception 'Member escalated their own access'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Even an approved profile must have an OAuth-authenticated Google identity.
update public.profiles set is_superadmin=true where id=current_setting('app.test_admin_id')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.test_admin_id'),'role','authenticated','amr',jsonb_build_array(jsonb_build_object('method','password')),'user_metadata',jsonb_build_object('is_superadmin',true))::text,true);
set local role authenticated;
do $$ begin
  if private.is_superadmin() then raise exception 'Password session bypassed Google login'; end if;
  begin perform public.admin_snapshot(); raise exception 'Password session read admin data'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.test_admin_id'),'role','authenticated','amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text,true);
set local role authenticated;
do $$ declare media uuid; version timestamptz; snap jsonb; begin
  snap := public.admin_snapshot();
  if not (snap ? 'profiles' and snap ? 'votes' and snap ? 'stats') then raise exception 'Snapshot incomplete'; end if;
  media := public.admin_save_media(null,'A test scene inside a rolled-back transaction','Write an original test caption about this fictional scene','Test caption that never becomes publicly visible','witty','test-model',null);
  snap := public.admin_snapshot();
  select (m->>'updated_at')::timestamptz into version from jsonb_array_elements(snap->'media') m where m->>'id'=media::text;
  perform public.admin_save_media(media,'An updated scene in this rolled-back transaction','Write an updated original test caption about this fictional scene','Updated caption, still never publicly visible','deadpan','test-model',version);
  begin
    perform public.admin_save_media(media,'A stale edit that must be rejected','Write an original test caption for a stale edit','Stale caption','witty','test-model',version-interval '1 second');
    raise exception 'Stale edit was accepted';
  exception when raise_exception then
    if sqlerrm not like 'This record changed.%' then raise; end if;
  end;
  perform public.admin_delete_media(media,false);
  if exists(select 1 from public.generations where id=media) then raise exception 'Deleted media is visible through public table policies'; end if;
  perform public.admin_delete_media(media,true);
  if not exists(select 1 from public.generations where id=media) then raise exception 'Restored media is missing'; end if;
end $$;
reset role;

select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  begin perform public.admin_snapshot(); raise exception 'Anonymous visitor read admin data'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: anonymous, non-admin, Google-only, self-escalation, CRUD, stale edits, and public-feed protection. All changes rolled back.' as result;
