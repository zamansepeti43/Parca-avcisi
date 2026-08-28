---
name: software-architecture
description: Preserve and improve Parça Avcısı architecture during feature work. Use before structural changes, new services, data flows, integrations, or refactors.
---

# Parça Avcısı Software Architecture

Prefer incremental architecture improvements over broad rewrites.

## Current architectural boundaries
- UI/rendering and interaction flows live in frontend modules.
- Reusable domain/data operations belong in service modules under `src/lib`.
- Supabase is the persistence/auth layer.
- Vercel API handlers are server-side boundaries for protected provider calls.
- AI image analysis uses provider-style components so local/fallback providers can coexist with remote AI.
- Database schema and migrations are the source of truth for persistence changes.

## Rules
1. Inspect existing modules before adding a new abstraction.
2. Keep UI code from containing secrets or privileged server credentials.
3. Keep provider-specific code behind a provider/service boundary.
4. Reuse existing listing, vehicle, part, image, request, message, notification, and auth services.
5. Prefer small modules with one responsibility.
6. Preserve existing fallbacks and user-review gates.
7. Database changes require a migration and schema synchronization when applicable.
8. Do not introduce a framework or dependency without a concrete project need.
9. Avoid circular dependencies and global state when an existing event/service pattern is sufficient.

## Before structural changes
Document: current flow, affected modules, data contract, compatibility risk, migration needs, and rollback path.

## Verification
Run lint/build and targeted browser tests. For database changes, verify the live schema/RLS where access permits.
