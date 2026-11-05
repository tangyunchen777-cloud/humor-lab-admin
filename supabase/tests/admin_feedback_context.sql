-- Database owner only. All fixtures, names and role changes roll back.
begin;
select set_config('app.feedback_admin',(select p.id::text from public.profiles p where p.is_superadmin
 and exists(select 1 from auth.identities i where i.user_id=p.id and i.provider='google') limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('app.feedback_admin'),'role','authenticated',
 'amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text,true);
select set_config('app.feedback_media',gen_random_uuid()::text,true);
insert into public.generations(id,creator_id,scene,prompt,caption,style,model,image_path)
values(current_setting('app.feedback_media')::uuid,current_setting('app.feedback_admin')::uuid,
 'A fictional photo used only in a rolled-back test','Write a fictional original caption for this test photo',
 'A temporary caption paired with its own source photo','witty','test-model',
 current_setting('app.feedback_admin')||'/'||gen_random_uuid()::text||'.png');
set local role authenticated;
do $$ declare photo record; config jsonb; saved_name text; chain uuid; begin
 select * into photo from public.admin_media_context(array[current_setting('app.feedback_media')::uuid]);
 if photo.image_path is null or photo.scene<>'A fictional photo used only in a rolled-back test' then raise exception 'Wrong caption image context';end if;
 perform public.admin_delete_media(photo.id,false);
 if not exists(select 1 from public.admin_media_context(array[photo.id]) where image_path=photo.image_path) then
  raise exception 'Archived rating lost its photo context';end if;
 config:=public.begin_generation('A fictional scene used only for request metadata','Write an original fictional caption for metadata verification.','witty',false);
 select variation_name,chain_id into saved_name,chain from public.generation_requests where id=(config->>'request_id')::uuid;
 if saved_name is null or saved_name is distinct from (select name from public.prompt_chains where id=chain) then
  raise exception 'Request did not capture the selected variation';end if;
 perform set_config('app.feedback_request',config->>'request_id',true);
 perform set_config('app.feedback_variation',saved_name,true);
end $$;
reset role;
update public.prompt_chains set name='Temporary renamed variation' where id=(select chain_id from public.generation_requests where id=current_setting('app.feedback_request')::uuid);
do $$ begin
 if (select variation_name from public.generation_requests where id=current_setting('app.feedback_request')::uuid)
  is distinct from current_setting('app.feedback_variation') then raise exception 'Rename rewrote request history';end if;
end $$;
update public.profiles set is_superadmin=false where id=current_setting('app.feedback_admin')::uuid;
set local role authenticated;
do $$ begin
 begin perform public.admin_media_context(array[current_setting('app.feedback_media')::uuid]);raise exception 'Member read admin photo context';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 begin perform public.admin_media_context(array[gen_random_uuid()]);raise exception 'Anonymous visitor read admin photo context';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: correct caption/photo associations, archived-media context, immutable variation labels, and member/anonymous denial. All changes rolled back.' as result;
