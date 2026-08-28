---
name: root-cause-debugging
description: Diagnose Parça Avcısı bugs by tracing the first broken layer before changing code. Use for frontend, Supabase, auth, RLS, API, AI-analysis, image, and deployment failures.
---

# Root-Cause Debugging

Do not patch symptoms blindly. Find the earliest point where expected behavior diverges from actual behavior.

## Investigation order
1. Reproduce the exact failure.
2. Record the expected vs actual result.
3. Check browser console and network failures.
4. Trace UI -> service/module -> API/Supabase -> database/RLS -> external provider where relevant.
5. Compare the actual payload/schema with the code's assumptions.
6. Identify the smallest root cause.
7. Make the smallest safe change.
8. Run the relevant regression tests/build/lint.

## Parça Avcısı-specific checks
- Auth/session and email/phone verification before protected actions.
- Supabase table, column, relation, embed, and RLS availability.
- Listing status/category/subcategory/vehicle/OEM data consistency.
- Listing image storage path, thumbnail path, metadata row, and cleanup behavior.
- AI provider availability, quota, cache, response JSON, confidence, and fallback behavior.
- Request/message/notification relationships.

## Rules
- Do not rewrite working modules merely to hide an error.
- Do not weaken RLS or authentication as a debugging shortcut.
- Do not invent database columns, endpoints, or provider behavior.
- Preserve working fallbacks.

## Completion
State the root cause, affected layer, minimal fix, regression coverage, and any remaining uncertainty.
