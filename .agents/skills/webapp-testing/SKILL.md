---
name: webapp-testing
description: Test Parça Avcısı end-to-end in a real browser. Use for UI regressions, release checks, critical user flows, responsive behavior, console errors, and verification after code changes.
---

# Parça Avcısı Webapp Testing

Use a real browser (prefer Playwright) to verify the application rather than relying only on static code inspection.

## Critical flows
1. Open the app and verify the home page renders without console errors.
2. Search listings by title, part, vehicle, OEM, category, and description.
3. Verify category/subcategory and condition filters.
4. Open a real listing and verify gallery, vehicle compatibility, seller, price, delivery, favorite/share, and contact actions.
5. Verify sign-in/session-dependent account flows.
6. Verify listing creation: draft, preview, publish, edit, status change, and delete.
7. Verify image upload limits, optimization, thumbnails, cover selection, reorder, and deletion.
8. Verify "Parça Arıyorum" creation, detail, seller "Bende Var", notifications, and request-based messaging when the live DB supports the feature.
9. Verify mobile and desktop layouts.

## Rules
- Test the deployed/current branch behavior after meaningful changes.
- Capture screenshots for visual regressions and failures.
- Inspect browser console errors and failed network requests.
- Prefer stable semantic selectors/data attributes; do not depend on fragile CSS classes.
- Do not mutate production data during tests unless the test explicitly requires it and cleanup is guaranteed.
- When a test fails, identify the first failing layer before changing code.

## Completion
Report tested flows, failures, console/network errors, and exact reproduction steps. Never claim a flow is verified without actually running it.
