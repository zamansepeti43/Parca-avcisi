---
name: skill-creator
description: Create and maintain focused AI skills for Parça Avcısı and its coding agent. Use when a repeated workflow, domain rule, validation procedure, or project capability should become reusable agent knowledge.
---

# Parça Avcısı Skill Creator

Create small, focused skills that encode repeatable project knowledge without duplicating the application itself.

## Skill design
- Give every skill one clear responsibility.
- Put stable domain rules in references when they become large.
- Put deterministic reusable logic in scripts when appropriate.
- Keep secrets, API keys, tokens, and user data out of skills.
- Prefer project-specific rules over generic advice.
- State prerequisites, inputs, outputs, failure behavior, and verification steps.

## Existing domain to respect
Parça Avcısı is an automotive-parts marketplace using Supabase, listings, vehicles, parts, images, messaging, favorites, notifications, saved searches, and part requests. It also has provider-based listing image analysis with OCR, barcode detection, catalog matching, and optional AI vision.

## Before creating a new skill
1. Search the repository for an existing skill or rule covering the same job.
2. Reuse existing project conventions instead of inventing parallel systems.
3. Keep the skill independent of any particular paid AI provider unless the task explicitly requires one.
4. Add a verification procedure.

## Completion
A new skill must be understandable by another agent without relying on hidden conversation context and must not claim capabilities that the application does not actually have.
