-- Keep every catalog source in one canonical product pool.
-- Same brand + normalized part number = one product record.
-- New sources merge into the existing product instead of creating a second copy.

alter table public.ai_catalog_records add column if not exists source_ids jsonb not null default '[]'::jsonb;
alter table public.ai_catalog_records add column if not exists source_urls jsonb not null default '[]'::jsonb;
alter table public.ai_catalog_records add column if not exists source_count integer not null default 0;

update public.ai_catalog_records
set source_ids = case when source_id is null then '[]'::jsonb else jsonb_build_array(source_id::text) end,
    source_urls = case when nullif(trim(source_url),'') is null then '[]'::jsonb else jsonb_build_array(source_url) end,
    source_count = case when source_id is null then 0 else 1 end
where source_ids = '[]'::jsonb and source_count = 0;

alter table public.ai_catalog_records drop constraint if exists ai_catalog_records_source_id_brand_part_number_key;

-- Existing duplicates are merged before the canonical unique index is created.
do $$
declare
  r record;
  keep_id uuid;
begin
  for r in (
    select brand, part_number, count(*) n
    from public.ai_catalog_records
    group by brand, part_number
    having count(*) > 1
  ) loop
    select id into keep_id
    from public.ai_catalog_records
    where brand = r.brand and part_number = r.part_number
    order by source_quality desc nulls last, updated_at desc, id
    limit 1;

    update public.ai_catalog_records k
    set oem_numbers = (
          select coalesce(jsonb_agg(distinct x order by x::text), '[]'::jsonb)
          from (
            select jsonb_array_elements(k.oem_numbers) x
            union
            select jsonb_array_elements(d.oem_numbers) x
            from public.ai_catalog_records d
            where d.brand = r.brand and d.part_number = r.part_number
          ) q
        ),
        applications = (
          select coalesce(jsonb_agg(distinct x order by x::text), '[]'::jsonb)
          from (
            select jsonb_array_elements(k.applications) x
            union
            select jsonb_array_elements(d.applications) x
            from public.ai_catalog_records d
            where d.brand = r.brand and d.part_number = r.part_number
          ) q
        ),
        structured_applications = (
          select coalesce(jsonb_agg(distinct x order by x::text), '[]'::jsonb)
          from (
            select jsonb_array_elements(k.structured_applications) x
            union
            select jsonb_array_elements(d.structured_applications) x
            from public.ai_catalog_records d
            where d.brand = r.brand and d.part_number = r.part_number
          ) q
        ),
        source_ids = (
          select coalesce(jsonb_agg(distinct x order by x::text), '[]'::jsonb)
          from (
            select jsonb_array_elements(k.source_ids) x
            union
            select jsonb_array_elements(d.source_ids) x
            from public.ai_catalog_records d
            where d.brand = r.brand and d.part_number = r.part_number
          ) q
        ),
        source_urls = (
          select coalesce(jsonb_agg(distinct x order by x::text), '[]'::jsonb)
          from (
            select jsonb_array_elements(k.source_urls) x
            union
            select jsonb_array_elements(d.source_urls) x
            from public.ai_catalog_records d
            where d.brand = r.brand and d.part_number = r.part_number
          ) q
        ),
        source_count = (
          select count(distinct x)
          from (
            select jsonb_array_elements(k.source_ids) x
            union
            select jsonb_array_elements(d.source_ids) x
            from public.ai_catalog_records d
            where d.brand = r.brand and d.part_number = r.part_number
          ) q
        ),
        source_quality = (
          select max(d.source_quality)
          from public.ai_catalog_records d
          where d.brand = r.brand and d.part_number = r.part_number
        ),
        updated_at = now()
    where k.id = keep_id;

    delete from public.ai_catalog_records d
    where d.brand = r.brand and d.part_number = r.part_number and d.id <> keep_id;
  end loop;
end $$;

create unique index if not exists ai_catalog_records_brand_part_number_key
  on public.ai_catalog_records(brand, part_number);

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

    insert into public.ai_catalog_records(
      source_id, brand, part_number, part_name, category,
      oem_numbers, applications, structured_applications,
      source_url, source_quality, raw_hash,
      source_ids, source_urls, source_count, updated_at
    ) values (
      (r->>'sourceId')::uuid,
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
    on conflict (brand, part_number) do update set
      part_name = coalesce(excluded.part_name, public.ai_catalog_records.part_name),
      category = coalesce(excluded.category, public.ai_catalog_records.category),
      oem_numbers = (
        select coalesce(jsonb_agg(distinct x order by x::text),'[]'::jsonb)
        from (
          select jsonb_array_elements(public.ai_catalog_records.oem_numbers) x
          union select jsonb_array_elements(excluded.oem_numbers) x
        ) q
      ),
      applications = (
        select coalesce(jsonb_agg(distinct x order by x::text),'[]'::jsonb)
        from (
          select jsonb_array_elements(public.ai_catalog_records.applications) x
          union select jsonb_array_elements(excluded.applications) x
        ) q
      ),
      structured_applications = (
        select coalesce(jsonb_agg(distinct x order by x::text),'[]'::jsonb)
        from (
          select jsonb_array_elements(public.ai_catalog_records.structured_applications) x
          union select jsonb_array_elements(excluded.structured_applications) x
        ) q
      ),
      source_ids = (
        select coalesce(jsonb_agg(distinct x order by x::text),'[]'::jsonb)
        from (
          select jsonb_array_elements(public.ai_catalog_records.source_ids) x
          union select jsonb_array_elements(excluded.source_ids) x
        ) q
      ),
      source_urls = (
        select coalesce(jsonb_agg(distinct x order by x::text),'[]'::jsonb)
        from (
          select jsonb_array_elements(public.ai_catalog_records.source_urls) x
          union select jsonb_array_elements(excluded.source_urls) x
        ) q
      ),
      source_count = (
        select count(distinct x)
        from (
          select jsonb_array_elements(public.ai_catalog_records.source_ids) x
          union select jsonb_array_elements(excluded.source_ids) x
        ) q
      ),
      source_quality = greatest(public.ai_catalog_records.source_quality, excluded.source_quality),
      raw_hash = excluded.raw_hash,
      source_id = excluded.source_id,
      source_url = excluded.source_url,
      updated_at = now();

    up := up + 1;
  end loop;

  return jsonb_build_object('upserted',up,'rejected',rej);
end;
$function$;
