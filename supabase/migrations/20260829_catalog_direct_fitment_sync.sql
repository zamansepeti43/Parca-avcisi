create or replace function public.sync_catalog_direct_fitments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  vehicles_added integer := 0;
  fitments_before integer;
  fitments_after integer;
  parts_covered integer;
begin
  select count(*) into fitments_before from public.part_vehicle_fitments;

  with source_apps as (
    select distinct
      trim(a->>'make') as make,
      trim(a->>'model') as model,
      nullif(a->>'year_from','')::integer as year_from,
      nullif(a->>'year_to','')::integer as year_to,
      nullif(trim(a->>'engine_code'),'') as engine_code,
      nullif(trim(a->>'source_url'),'') as source_url,
      coalesce((a->>'source_quality')::numeric, r.source_quality, 0.99) as source_quality
    from public.ai_catalog_records r
    cross join lateral (
      select value as a from jsonb_array_elements(coalesce(r.structured_applications,'[]'::jsonb))
      union all
      select value as a from jsonb_array_elements(coalesce(r.applications,'[]'::jsonb))
    ) apps
    where coalesce(trim(a->>'make'),'') <> ''
      and coalesce(trim(a->>'model'),'') <> ''
  )
  insert into public.vehicles(make,model,year_from,year_to,engine_code,source_url,source_quality)
  select s.make,s.model,s.year_from,s.year_to,s.engine_code,s.source_url,s.source_quality
  from source_apps s
  where not exists (
    select 1 from public.vehicles v
    where upper(trim(v.make))=upper(s.make)
      and upper(trim(v.model))=upper(s.model)
      and coalesce(v.year_from,0)=coalesce(s.year_from,0)
      and coalesce(v.year_to,9999)=coalesce(s.year_to,9999)
      and coalesce(upper(trim(v.engine_code)),'')=coalesce(upper(s.engine_code),'')
      and coalesce(v.source_url,'')=coalesce(s.source_url,'')
  );

  get diagnostics vehicles_added = row_count;

  with candidates as (
    select
      p.id as part_id,
      v.id as vehicle_id,
      r.id as source_record_id,
      least(1,greatest(0,coalesce((a->>'source_quality')::numeric,r.source_quality,0.99))) as confidence
    from public.ai_catalog_records r
    join public.parts p
      on upper(regexp_replace(trim(p.brand),'[^A-Z0-9]+','','g')) = upper(regexp_replace(trim(r.brand),'[^A-Z0-9]+','','g'))
     and upper(regexp_replace(trim(p.part_number),'[^A-Z0-9]+','','g')) = upper(regexp_replace(trim(r.part_number),'[^A-Z0-9]+','','g'))
    cross join lateral (
      select value as a from jsonb_array_elements(coalesce(r.structured_applications,'[]'::jsonb))
      union all
      select value as a from jsonb_array_elements(coalesce(r.applications,'[]'::jsonb))
    ) apps
    join public.vehicles v
      on upper(trim(v.make))=upper(trim(a->>'make'))
     and upper(trim(v.model))=upper(trim(a->>'model'))
     and coalesce(v.year_from,0)<=coalesce(nullif(a->>'year_to','')::integer,9999)
     and coalesce(nullif(a->>'year_from','')::integer,0)<=coalesce(v.year_to,9999)
     and (
       coalesce(trim(a->>'engine_code'),'')=''
       or coalesce(trim(v.engine_code),'')=''
       or upper(trim(v.engine_code))=upper(trim(a->>'engine_code'))
     )
    where coalesce(trim(a->>'make'),'')<>''
      and coalesce(trim(a->>'model'),'')<>''
  ), dedup as (
    select distinct on (part_id,vehicle_id)
      part_id,vehicle_id,source_record_id,confidence
    from candidates
    order by part_id,vehicle_id,confidence desc
  )
  insert into public.part_vehicle_fitments(part_id,vehicle_id,match_method,confidence,source_record_id)
  select part_id,vehicle_id,'catalog_direct',confidence,source_record_id
  from dedup
  on conflict(part_id,vehicle_id) do update set
    match_method=excluded.match_method,
    confidence=greatest(public.part_vehicle_fitments.confidence,excluded.confidence),
    source_record_id=excluded.source_record_id;

  select count(*) into fitments_after from public.part_vehicle_fitments;
  select count(distinct part_id) into parts_covered from public.part_vehicle_fitments where match_method='catalog_direct';

  return jsonb_build_object(
    'vehicles_added',vehicles_added,
    'fitments_before',fitments_before,
    'fitments_after',fitments_after,
    'fitments_added',greatest(0,fitments_after-fitments_before),
    'parts_with_catalog_direct_fitment',parts_covered
  );
end;
$function$;
