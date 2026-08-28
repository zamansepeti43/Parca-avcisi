-- Fix PostgreSQL aggregate ordering: DISTINCT + ORDER BY cannot be used
-- directly together when the ORDER BY expression is not in the aggregate list.
-- Keep one canonical product per brand + normalized part number and merge
-- catalog sources without requiring sourceId to be a UUID.

create or replace function public.upsert_catalog_batch(records jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  r jsonb;
  up integer := 0;
  rej integer := 0;
  incoming_source_id uuid;
begin
  if jsonb_typeof(records) <> 'array' then
    raise exception 'records must be array';
  end if;

  for r in select * from jsonb_array_elements(records) loop
    if coalesce(trim(r->>'brand'),'') = ''
       or coalesce(trim(r->>'partNumber'),'') = ''
       or coalesce(trim(r->>'sourceUrl'),'') = '' then
      rej := rej + 1;
      continue;
    end if;

    incoming_source_id := case
      when coalesce(r->>'sourceId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (r->>'sourceId')::uuid
      else null
    end;

    insert into public.ai_catalog_records(
      source_id, brand, part_number, part_name, category,
      oem_numbers, applications, structured_applications,
      source_url, source_quality, raw_hash,
      source_ids, source_urls, source_count, updated_at
    ) values (
      incoming_source_id,
      trim(r->>'brand'),
      upper(regexp_replace(trim(r->>'partNumber'),'[[:space:]./_-]+','','g')),
      nullif(trim(r->>'partName'),''),
      nullif(trim(r->>'category'),''),
      coalesce(r->'oemNumbers','[]'::jsonb),
      coalesce(r->'applications','[]'::jsonb),
      coalesce(r->'structuredApplications','[]'::jsonb),
      trim(r->>'sourceUrl'),
      least(1,greatest(0,coalesce((r->>'sourceQuality')::numeric,0))),
      r->>'rawHash',
      jsonb_build_array(r->>'sourceId'),
      jsonb_build_array(trim(r->>'sourceUrl')),
      1,
      now()
    )
    on conflict (brand,part_number) do update set
      part_name = coalesce(excluded.part_name,public.ai_catalog_records.part_name),
      category = coalesce(excluded.category,public.ai_catalog_records.category),
      oem_numbers = (
        select coalesce(jsonb_agg(x order by x::text),'[]'::jsonb)
        from (
          select distinct x
          from (
            select jsonb_array_elements(public.ai_catalog_records.oem_numbers) x
            union all
            select jsonb_array_elements(excluded.oem_numbers) x
          ) s
        ) q
      ),
      applications = (
        select coalesce(jsonb_agg(x order by x::text),'[]'::jsonb)
        from (
          select distinct x
          from (
            select jsonb_array_elements(public.ai_catalog_records.applications) x
            union all
            select jsonb_array_elements(excluded.applications) x
          ) s
        ) q
      ),
      structured_applications = (
        select coalesce(jsonb_agg(x order by x::text),'[]'::jsonb)
        from (
          select distinct x
          from (
            select jsonb_array_elements(public.ai_catalog_records.structured_applications) x
            union all
            select jsonb_array_elements(excluded.structured_applications) x
          ) s
        ) q
      ),
      source_ids = (
        select coalesce(jsonb_agg(x order by x::text),'[]'::jsonb)
        from (
          select distinct x
          from (
            select jsonb_array_elements(public.ai_catalog_records.source_ids) x
            union all
            select jsonb_array_elements(excluded.source_ids) x
          ) s
        ) q
      ),
      source_urls = (
        select coalesce(jsonb_agg(x order by x::text),'[]'::jsonb)
        from (
          select distinct x
          from (
            select jsonb_array_elements(public.ai_catalog_records.source_urls) x
            union all
            select jsonb_array_elements(excluded.source_urls) x
          ) s
        ) q
      ),
      source_count = (
        select count(distinct x)
        from (
          select jsonb_array_elements(public.ai_catalog_records.source_ids) x
          union all
          select jsonb_array_elements(excluded.source_ids) x
        ) q
      ),
      source_quality = greatest(public.ai_catalog_records.source_quality,excluded.source_quality),
      raw_hash = excluded.raw_hash,
      source_id = coalesce(excluded.source_id,public.ai_catalog_records.source_id),
      source_url = excluded.source_url,
      updated_at = now();

    up := up + 1;
  end loop;

  return jsonb_build_object('upserted',up,'rejected',rej);
end;
$function$;
