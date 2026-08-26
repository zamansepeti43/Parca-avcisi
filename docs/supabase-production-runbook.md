# Parça Avcısı — Supabase Production Runbook

## Repository state

The repository now contains the complete additive migration chain through 2026-08-26, including `20260826_production_sync.sql` and the storage ownership hardening migration.

## Production application order

Apply migrations in filename order. The key production consolidation migration is:

`supabase/migrations/20260826_production_sync.sql`

Then ensure these hardening migrations are applied:

- `20260826_public_seller_profiles.sql`
- `20260826_saved_vehicles.sql`
- `20260826_storage_listing_ownership_hardening.sql`
- `20260826_listing_reports.sql`
- `20260826_message_permissions_hardening.sql`
- `20260826150000_platform_settings.sql`
- `20260826150500_phone_identity.sql`
- `20260826151000_claim_verified_phone.sql`
- `20260826151500_platform_status.sql`

## Verification

Run `supabase/production-verification.sql` in the production project's SQL Editor. The result must show the required tables, columns, storage bucket, RLS, indexes and realtime publication entries.

## Important limitation

This environment has repository/Vercel access but no authenticated Supabase SQL connector, so the production database cannot be executed or inspected directly from this run. The migration files are committed and the read-only verification script is prepared; the final production step is applying the migration chain in the Supabase project and running the verification queries.

Do not paste a service-role key into the browser or repository. Keep it server-side only.
