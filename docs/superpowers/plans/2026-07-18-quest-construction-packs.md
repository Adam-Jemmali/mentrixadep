# Quest Construction Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Home proof strip; make Start Pack construction-first with Desmos-like graphs for functions named in stems.

**Architecture:** Strengthen pure selection (`preferConstructionMix` → construction-first) and curve enrichment; strip Home rail wiring; seed construction templates via existing script path. No live Gemini.

**Tech Stack:** Next.js App Router, TypeScript pure modules, Vitest, Supabase item_bank, existing quest SVG graph.

**Spec:** `docs/superpowers/specs/2026-07-18-quest-construction-packs-design.md`

## Global Constraints

- AP Calculus AB only for packs
- No live Gemini quiz generation
- Gold only for verified truth UI elsewhere; Home proof strip removed entirely
- VFA / rank logic unchanged
- MCQ last resort only when construction pool cannot fill

---

### Task 1: Home proof strip removal

**Files:**
- Modify: `src/app/(app)/student/page.tsx`
- Test: manual / ensure no leftover imports

- [x] Remove `loadVerifiedAttemptProofCards` call and `VerifiedAttemptProofRail` render
- [x] Remove unused imports
- [x] Confirm page still loads rank / membership

### Task 2: Construction-first selection

**Files:**
- Modify: `src/features/quest/quest-interaction-formats-pure.ts` (`preferConstructionMix`)
- Modify: `src/features/quest/item-bank-selector.ts` if call site needs packType tweaks
- Test: `tests/unit/quest-interaction-formats-pure.test.ts` (create if missing)

- [x] Change mix so construction is preferred until pack filled (targetShare ≈ 1.0 / always prefer construction when available)
- [x] Unit test: with mixed pool, picks construction first
- [x] Unit test: falls back to MCQ when no construction left

### Task 3: Prompt → curve enrichment

**Files:**
- Modify: `src/features/quest/quest-stimulus-pure.ts` (`detectCurveExpressionFromPrompt` / enrich)
- Test: `tests/unit/quest-stimulus-pure.test.ts`

- [x] Ensure stems like `x^3`, `f(x) = x^3 - 2x` produce `function_graph` with blue curve
- [x] Do not invent graph when no clear curve
- [x] Extend tests

### Task 4: Construction bank seed path

**Files:**
- Review: `scripts/auto-approve-construction-items.ts`, `scripts/lib/construction-item-templates-pure.ts`
- Ensure templates include graph stimulus or plottable stems
- Document/run seed command if env available; otherwise make templates graph-ready for ops

- [x] Confirm templates cover FR / cloze / drag / graph_feature with plottable stems
- [x] Strengthen templates that mention functions to include stimulus or clear `f(x)=` text

### Task 5: Verify

- [x] `npx vitest run` on touched unit tests
- [x] `npx tsc --noEmit`
