# Parça Avcısı — Agent Instructions

## Product goal
Parça Avcısı is a Turkish automotive-parts marketplace for new (sıfır), used (2. el), and dismantled (çıkma) parts.

## Current stage
MVP foundation. Keep the first release focused on discovery, search, listing detail, seller contact, and basic user flows. Do not add payments, complex messaging infrastructure, or advanced vehicle compatibility until the core marketplace flow is stable.

## Stack
- Vite
- React/ReactDOM-compatible frontend
- Plain JavaScript is currently used in `src/` to keep the MVP lightweight.
- `lucide-react` is available for icons.

## Working rules
1. Inspect existing files before changing them.
2. Preserve Turkish copy and the Parça Avcısı brand identity.
3. Mobile-first and responsive by default.
4. Prefer small, reusable modules over one giant component.
5. Do not add a backend dependency unless the task explicitly requires it.
6. Never hard-code secrets, API keys, tokens, or credentials.
7. Run `npm run build` after meaningful frontend changes.
8. Keep demo/mock data clearly separated from future API data.
9. Before destructive changes, explain the impact and prefer a branch/PR.
10. Do not claim a feature is production-ready until it has been tested.

## MVP priorities
1. Home/search/category discovery
2. Listing cards and listing detail
3. New/used/dismantled filters
4. Vehicle/part search structure
5. Seller/listing creation flow
6. Authentication/profile
7. Supabase/Postgres backend
8. Messaging and notifications
9. Moderation/trust
10. Vercel + Android/Play release

## Handoff rule
When another coding agent continues the project, read `TASKS.md` and this file first. Update `TASKS.md` after completing a task.
