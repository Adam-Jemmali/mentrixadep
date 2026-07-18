# Quest construction packs + Home proof strip removal

**Date:** 2026-07-18  
**Product:** mentrixa.one  
**Status:** Draft for user review  

## Goal

Make Quest packs feel like Mentrixa, not a generic MCQ quiz: construction interactions, visible function graphs, and valuable first-attempt work. Remove the Home proof card strip so Home is not a wall of Locked miss / Verified cards.

## Decisions (approved)

| Topic | Choice |
|-------|--------|
| Home proof strip | Remove entirely (Locked miss **and** Verified cards) |
| Pack format mix | Almost all construction; MCQ only last-resort if bank cannot fill |
| Difficulty chips | Harder math / challenge rating only; same construction formats at Beginner / Intermediate / Advanced |
| Graphs | Keep Mentrixa Desmos-styled SVG (blue curves); no Desmos SDK this pass |
| Function in stem | If the question states a plottable function (e.g. `x^3`, `f(x)=…`), draw it on the graph |
| Gemini | No live question generation; seed reviewed / machine-gradable templates only |

## Non-goals

- Embedding the real Desmos API
- Changing Verified First Attempt storage or rank math
- Redesigning guest diagnostic (may remain MCQ until a follow-up)
- Reintroducing Home proof cards behind a flag in this pass

---

## 1. Home

### Behavior

Student Home no longer loads or renders the verified-attempt proof rail.

### Touch points

- `src/app/(app)/student/page.tsx` — remove `loadVerifiedAttemptProofCards` usage and `VerifiedAttemptProofRail` mount
- Leave `load-verified-attempt-proof.ts` / `verified-attempt-card.tsx` in the codebase for possible reuse elsewhere; do not delete unless unused after Home removal and no other callers

### Rank safety

Do **not** change:

- `verified_first_attempts` writes
- calibrated rank / XP heroes
- mastery grid locked-miss copy

Home display only.

---

## 2. Quest pack selection

### Construction formats (required preference)

Approved pack slots prefer only:

- `free_response`
- `complete_expression`
- `drag_order`
- `graph_feature`

(Existing multi_part may remain eligible if already treated as construction; do not expand MCQ.)

### Selection policy change

Replace soft ~30% mix (`preferConstructionMix` targetShare `0.3`) with **construction-first**:

1. Build the pool of approved AP Calculus AB items as today (skill priority unchanged).
2. For each pack slot, prefer items where `isConstructionItemFormat` is true.
3. Use MCQ only when the construction sub-pool cannot fill the remaining slots.
4. Set quest `packType` to reflect reality (`mixed` only if MCQ fallback was needed; prefer labeling construction-heavy packs clearly in metadata).

Difficulty (`beginner` | `intermediate` | `advanced`) continues to affect challenge rating / stem hardness bias, **not** which interaction formats are allowed.

### Bank inventory

Runtime alone cannot invent quality construction items. Implementation must ensure enough approved rows exist:

- Seed deterministic templates from `scripts/lib/construction-item-templates-pure.ts` (and related auto-approve path) across AP Calc AB skill nodes
- Templates must include machine-gradable ground truth (already required by construction auto-approve)
- Graph-related templates must include `function_graph` stimulus **or** a stem that enrichment can plot reliably

Fill order: construction items first until the pack size is met. If construction inventory is short, fill remaining slots with MCQ as last resort (choice A). After seeding, an all-MCQ pack should be rare; if the bank cannot meet minimum pack size at all, use the existing bank-unavailable failure. Do not prefer MCQ when construction rows are available.

### AI rule

No Gemini call generates quest questions. Seeding is offline / scripted from reviewed templates.

---

## 3. Function graphs (Desmos look)

### Renderer

Keep `quest-function-graph.tsx` + `QUEST_GRAPH_CURVE_BLUE` (Desmos-like blue). Do not add Desmos SDK.

### Enrichment requirement

Strengthen / extend `enrichQuestStimulus` + curve detection so that:

- When the prompt contains a clear plottable expression (examples: `x^3`, `f(x) = x^3 - 2x`, `y = sin(x)`), a `function_graph` stimulus is attached if missing, or empty axes get that curve.
- Authored stimulus always wins when it already defines usable curves/points/Riemann.
- Skip inventing a graph when no single clear curve exists or plotting would mislead (pure symbolic rewrite with no geometric meaning).

### UX expectation

During Start Pack play, students should see the curve for functions named in the stem — not blank axes and not text-only when a plot is possible.

---

## 4. Data flow

```text
Start Pack (difficulty chip)
  → createPracticeQuest
  → selectItemBankQuestions
       → skill priority (unchanged)
       → prefer construction formats (new stronger policy)
       → itemToPracticeQuestion + enrichQuestStimulus (curve from stem)
  → quest UI (math input / cloze / drag / graph feature + stimulus block)
  → submit + VFA (unchanged weight rules)
```

Home:

```text
student/page.tsx
  → (no proof rail load/render)
  → rank / membership / Book a Guide unchanged
```

---

## 5. Error handling

| Case | Behavior |
|------|----------|
| Construction bank empty / too thin | Seed templates; fill with construction first, MCQ last resort; if still under minimum pack size, fail create with clear message |
| Stem has no plottable curve | No fake graph |
| Invalid construction row (fails `itemToPracticeQuestion`) | Drop from pool; do not count toward pack |
| Graph feature without graph after enrichment | Keep existing hard null filter so broken items never enter the pack |

---

## 6. Testing

- Unit: construction-first selection prefers non-MCQ until construction pool exhausted
- Unit: Home page wiring no longer depends on proof rail (or component test / snapshot of page composition)
- Unit: `enrichQuestStimulus` draws `x^3` / `f(x)=…` style stems into `function_graph` with blue curve
- Existing construction grading / auto-approve tests remain green
- Run targeted vitest + `tsc` before claiming done

---

## 7. Implementation order

1. Remove Home proof strip
2. Harden construction-first selection (+ difficulty stays format-neutral)
3. Strengthen prompt→curve enrichment for common AP Calc expressions
4. Seed / auto-approve construction templates for AP Calc AB nodes
5. Verify Start Pack shows non-MCQ + graphs end-to-end
6. Tests + typecheck

---

## Success criteria

- Home shows no Locked miss / Verified proof cards
- Starting Beginner / Intermediate / Advanced packs yields mostly drag / expression / graph / free-response items, not walls of MCQ
- When a stem states a function like `x^3`, the blue Mentrixa graph shows that curve
- Rank / VFA mechanics unchanged
- No live Gemini quiz generation

## Out of scope follow-ups

- Real Desmos embed
- Guest diagnostic construction packs
- Restoring proof cards on another surface (Skills / profile)
