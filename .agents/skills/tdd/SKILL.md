---
name: tdd
description: Apply practical test-driven development to new Parça Avcısı behavior and bug fixes. Use when changing business rules, search, listing flows, AI analysis, data transforms, or other regression-prone logic.
---

# Parça Avcısı TDD

For new or changed behavior, define the expected behavior first, then implement the smallest change that satisfies it.

## Cycle
1. Define a focused failing case or acceptance criterion.
2. Implement the minimum code required.
3. Run the focused test.
4. Refactor without changing behavior.
5. Run regression checks.

## High-value test targets
- Listing search tokenization, Turkish casing, relevance ordering, OEM matching, year ranges, and empty results.
- Vehicle catalog selection and compatibility mapping.
- Listing creation/update/status validation.
- Image count/size/cover/reorder behavior.
- AI analysis normalization, confidence, review requirements, JSON handling, cache hits, quota failures, and fallbacks.
- Part-request creation, response deduplication, notifications, and request messaging.
- Authentication/authorization boundaries.

## Rules
- Tests must assert observable behavior, not implementation details.
- Mock external AI/network providers when testing deterministic business logic.
- Keep production code free of test-only shortcuts.
- Do not remove a failing test just because it exposes a regression.

## Completion
Run the focused tests plus lint/build. For user-facing flows, pair TDD with the Webapp Testing skill.
