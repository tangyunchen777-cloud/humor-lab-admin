-- Atomic, Google-superadmin-only edits. Base table grants stay read-only.
begin;
alter table public.prompt_chains add column updated_at timestamptz not null default clock_timestamp();
create trigger chain_timestamp before update on public.prompt_chains for each row execute function private.catalog_before_write();
create trigger chain_audit after update on public.prompt_chains for each row execute function private.catalog_audit();

create function private.admin_save_prompt_chain(chain_uuid uuid, expected_updated_at timestamptz, chain_name text, chain_description text, chain_steps jsonb)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare current_version timestamptz; saved_version timestamptz; step_count integer; position_offset integer;
begin
  if not private.is_superadmin() then raise insufficient_privilege; end if;
  select updated_at into current_version from public.prompt_chains where id=chain_uuid for update;
  if not found then raise exception 'This prompt chain is no longer available'; end if;
  if expected_updated_at is distinct from current_version then
    raise exception 'This prompt chain changed. Refresh before saving.' using errcode='40001';
  end if;
  if chain_name is null or length(btrim(chain_name)) not between 1 and 120
    or chain_description is null or length(btrim(chain_description)) not between 1 and 1000
    or chain_steps is null or jsonb_typeof(chain_steps)<>'array' then
    raise exception 'Check the chain name, description, and instructions' using errcode='22023';
  end if;
  select count(*),coalesce(max(position),0) into step_count,position_offset from public.prompt_chain_steps where chain_id=chain_uuid;
  if jsonb_array_length(chain_steps)<>step_count or step_count not between 1 and 20 or length(chain_steps::text)>20000 then
    raise exception 'Include every existing step exactly once' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(chain_steps) item
    where jsonb_typeof(item)<>'object' or jsonb_typeof(item->'id') is distinct from 'string'
      or coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name')) not between 1 and 120
      or jsonb_typeof(item->'instruction') is distinct from 'string' or length(btrim(item->>'instruction')) not between 1 and 2000) then
    raise exception 'Check each step name and instruction' using errcode='22023';
  end if;
  if (select count(distinct (item->>'id')::uuid) from jsonb_array_elements(chain_steps) item)<>step_count
    or exists(select 1 from jsonb_array_elements(chain_steps) item where not exists(
      select 1 from public.prompt_chain_steps s where s.id=(item->>'id')::uuid and s.chain_id=chain_uuid)) then
    raise exception 'Include every existing step exactly once' using errcode='22023';
  end if;
  if (select sum(length(item->>'instruction')) from jsonb_array_elements(chain_steps) item)>8000 then
    raise exception 'Keep the combined instructions within 8000 characters' using errcode='22023';
  end if;
  -- Avoid unique-position collisions while preserving stable step IDs.
  update public.prompt_chain_steps set position=position+position_offset+step_count where chain_id=chain_uuid;
  update public.prompt_chain_steps s set position=entry.ordinality::integer,
    name=btrim(entry.item->>'name'),instruction=btrim(entry.item->>'instruction')
    from jsonb_array_elements(chain_steps) with ordinality entry(item,ordinality)
    where s.id=(entry.item->>'id')::uuid and s.chain_id=chain_uuid;
  update public.prompt_chains set name=btrim(chain_name),description=btrim(chain_description)
    where id=chain_uuid returning updated_at into saved_version;
  return saved_version;
end $$;
revoke all on function private.admin_save_prompt_chain(uuid,timestamptz,text,text,jsonb) from public,anon;
grant execute on function private.admin_save_prompt_chain(uuid,timestamptz,text,text,jsonb) to authenticated;

create function public.admin_save_prompt_chain(chain_uuid uuid, expected_updated_at timestamptz, chain_name text, chain_description text, chain_steps jsonb)
returns timestamptz language sql security invoker set search_path='' as $$
  select private.admin_save_prompt_chain(chain_uuid,expected_updated_at,chain_name,chain_description,chain_steps);
$$;
revoke all on function public.admin_save_prompt_chain(uuid,timestamptz,text,text,jsonb) from public,anon;
grant execute on function public.admin_save_prompt_chain(uuid,timestamptz,text,text,jsonb) to authenticated;
commit;
