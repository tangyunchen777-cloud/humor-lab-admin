-- Active captions accept member votes; archived captions and other users' votes
-- remain protected. All fixture rows and votes roll back.
begin;
select set_config('app.vote_test_user', (select p.id::text from public.profiles p
  where p.is_superadmin and exists (select 1 from auth.identities i
    where i.user_id=p.id and i.provider='google') limit 1), true);
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('app.vote_test_user'), 'role', 'authenticated',
  'amr', jsonb_build_array(jsonb_build_object('method','oauth')))::text, true);
set local role authenticated;
do $$ declare media uuid; begin
  media := public.admin_save_media(null,
    'A voting fixture that is never published outside this transaction',
    'Write an original fictional caption for a voting permissions test',
    'A temporary caption for a rolled-back database test', 'witty', 'test-model', null);
  perform public.cast_vote(media, 1::smallint);
  if not exists (select 1 from public.votes where generation_id=media
    and user_id=(select auth.uid()) and value=1) then
    raise exception 'Active-caption upvote was not saved';
  end if;
  perform public.cast_vote(media, (-1)::smallint);
  if (select count(*) from public.votes where generation_id=media) <> 1
    or not exists (select 1 from public.votes where generation_id=media and value=-1) then
    raise exception 'Vote change did not update the existing row';
  end if;
  begin
    insert into public.votes(generation_id,user_id,value)
    values (media,gen_random_uuid(),1);
    raise exception 'Voting as another user was accepted';
  exception when insufficient_privilege then null;
  end;
  perform public.admin_delete_media(media,false);
  begin
    perform public.cast_vote(media, 1::smallint);
    raise exception 'Archived-caption RPC vote was accepted';
  exception when raise_exception then
    if sqlerrm <> 'This caption is not available' then raise; end if;
  end;
  begin
    update public.votes set value=1 where generation_id=media;
    raise exception 'Archived-caption direct vote update was accepted';
  exception when insufficient_privilege then null;
  end;
  delete from public.votes where generation_id=media and user_id=(select auth.uid());
  begin
    insert into public.votes(generation_id,user_id,value) values(media,(select auth.uid()),1);
    raise exception 'Archived-caption direct vote insert was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  begin
    perform public.cast_vote(gen_random_uuid(),1::smallint);
    raise exception 'Anonymous vote was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: active vote insert/change, archived-media protection, voter ownership, and anonymous rejection. All changes rolled back.' as result;
