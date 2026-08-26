-- Parça Avcısı production verification
-- Run AFTER all migrations, especially 20260826_production_sync.sql.
-- This file is read-only: it does not modify production data.

-- 1) Required tables
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','listings','listing_images','listing_vehicles','vehicles','parts',
    'messages','notifications','part_requests','part_request_responses','part_request_images'
  )
order by table_name;

-- 2) Required listing columns
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'listings'
  and column_name in ('delivery','status','seller_id','created_at','updated_at')
order by column_name;

-- 3) Required notification columns
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications'
  and column_name in ('user_id','type','related_request_id','created_at')
order by column_name;

-- 4) Listing image storage bucket
select id, name, public
from storage.buckets
where id = 'listing-images';

-- 5) RLS enabled on critical tables
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','listings','listing_images','messages','notifications','part_requests','part_request_responses','part_request_images')
order by c.relname;

-- 6) Critical indexes
select schemaname, tablename, indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'part_requests_status_idx','part_requests_category_idx','part_requests_city_idx',
    'part_requests_make_idx','part_requests_part_subcategory_idx','messages_request_idx',
    'listing_images_listing_order_idx'
  )
order by tablename, indexname;

-- 7) Realtime publication coverage
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('messages','part_requests','part_request_responses')
order by tablename;
