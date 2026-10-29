begin;
alter table public.generations add column generation_request_id uuid unique references public.generation_requests(id);
grant insert(generation_request_id) on public.generations to authenticated;
create function private.link_generation_trace() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.generation_request_id is not null then
  update public.generation_requests set generation_id=new.id
  where id=new.generation_request_id and user_id=new.creator_id and status='succeeded' and generation_id is null;
  if not found then raise exception 'This generation request is not available for publishing'; end if;
 end if;
 return new;
end $$;
revoke all on function private.link_generation_trace() from public;
create trigger link_generation_trace after insert on public.generations for each row execute function private.link_generation_trace();
select pg_notify('pgrst','reload schema');
commit;
