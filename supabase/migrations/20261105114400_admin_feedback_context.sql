begin;
-- Capture the label now so later chain renames do not rewrite new request history.
alter table public.generation_requests add column variation_name text;
create function private.capture_request_variation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.variation_name := (select name from public.prompt_chains where id=new.chain_id);
  return new;
end $$;
revoke all on function private.capture_request_variation() from public,anon,authenticated;
create trigger capture_request_variation before insert on public.generation_requests
  for each row execute function private.capture_request_variation();

-- Resolve source images for the exact caption IDs on a page, including archived
-- media. Existing superadmins already have this data in admin_snapshot.
create function private.admin_media_context(media_ids uuid[])
returns table(id uuid,image_path text,scene text) language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_superadmin() then raise insufficient_privilege; end if;
  if coalesce(cardinality(media_ids),0)>1000 then raise exception 'Too many media IDs' using errcode='22023'; end if;
  return query select g.id,g.image_path,g.scene from public.generations g where g.id=any(media_ids);
end $$;
revoke all on function private.admin_media_context(uuid[]) from public,anon;
grant execute on function private.admin_media_context(uuid[]) to authenticated;
create function public.admin_media_context(media_ids uuid[])
returns table(id uuid,image_path text,scene text) language sql stable security invoker set search_path='' as $$
  select * from private.admin_media_context(media_ids);
$$;
revoke all on function public.admin_media_context(uuid[]) from public,anon;
grant execute on function public.admin_media_context(uuid[]) to authenticated;
commit;
