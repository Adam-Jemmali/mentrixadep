# Skill Tree Frontier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an animated Frontier Tree as the primary AP Calculus AB skill surface, with real DAG locks at Solid (≥70% or verified correct), while keeping the current Mastery Grid as a full subset of the same nodes, states, and loaders.

**Architecture:** New `src/features/skill-tree/` pure modules for graph, unlock, frontier, and copy. `loadSkillTree` wraps / shares internals with `loadMasteryGrid` so `MasteryGridData` remains available. Mastery page renders Frontier canvas first; existing unit accordion becomes All skills. Quest start gates on unlock. Phases 2–5 add error tags, decay on-tree, Mistake Treasury, Phoenix XP, and solve-time velocity.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Supabase (new migrations only), framer-motion, d3, MentrixaVocabIcon (`/public/icons/vocab/`).

**Spec:** `docs/superpowers/specs/2026-07-18-skill-tree-frontier-design.md`

## Global Constraints

- Current skill tree ⊆ new skill tree (same `skill_nodes`, same states, same VFA)
- AP Calculus AB only
- No live Gemini for items or coaching
- Gold only for verified truth UI
- VFA unique `(user_id, skill_node_id)` and rank math unchanged
- New migrations only; never edit existing SQL files
- Every mutation: `requireAuth` or `requireRole`
- Zod on all action inputs
- Copy: icon first, ≤4 words, no hyphen bullets, no emoji
- Run tests after every task; `npx tsc --noEmit` before phase ship
- Prefer MentrixaVocabIcon over Lucide for product nouns

## Superset compatibility checklist (every phase)

Before merging any phase, confirm:

1. `npm run skill-tree:verify` still passes node count 100–150  
2. `loadMasteryGrid(userId)` returns the same node IDs as before (plus unlock metadata only in tree load)  
3. Hub `MasteryGridHubCard` still types against `MasteryGridData`  
4. Post-pack `pickQuestMasteryHighlight` still works  
5. No CED slug removed from `scripts/data/ap-calc-ab-skill-nodes.json`  

## File map

| Path | Role |
|---|---|
| `src/features/skill-tree/skill-tree-graph-pure.ts` | DAG parse, cycle detect, children/parents |
| `src/features/skill-tree/skill-tree-unlock-pure.ts` | Solid set + `isNodeUnlocked` |
| `src/features/skill-tree/skill-tree-frontier-pure.ts` | Frontier view model |
| `src/features/skill-tree/skill-tree-copy-pure.ts` | Icon name + brief labels |
| `src/features/skill-tree/types.ts` | Tree types; grid types imported not duplicated |
| `src/features/skill-tree/load-skill-tree.ts` | Server load; exposes grid + frontier |
| `src/features/skill-tree/assert-node-unlocked.ts` | Server gate helper |
| `src/features/skill-tree/skill-tree-canvas.tsx` | Animated canvas |
| `src/features/skill-tree/skill-tree-node.tsx` | Node chip |
| `src/features/skill-tree/skill-tree-edge.tsx` | Animated edge |
| `src/features/skill-tree/skill-tree-page-client.tsx` | Page client: frontier + All skills |
| `scripts/data/ap-calc-ab-skill-prereqs.json` | slug → slug[] DAG |
| `scripts/seed-ap-calc-ab-skill-tree.ts` | Apply JSON prereqs |
| `scripts/verify-ap-calc-skill-tree.ts` | Acyclic + coverage checks |
| Keep: `src/features/mastery-grid/*` | Subset UI + pure state resolution |

---

# Agent prompt book (paste these in order)

Use one prompt per task (or per phase kickoff). Do not skip Phase 1.

### Prompt 0 — Session bootstrap (every new chat)

```text
Read docs/superpowers/specs/2026-07-18-skill-tree-frontier-design.md and
docs/superpowers/plans/2026-07-18-skill-tree-frontier.md.

Constraints: Mentrixa master context (VFA rank only, AP Calc AB, no live Gemini,
gold = verified only). Current Mastery Grid must remain a subset of this system.

Execute ONLY the next unchecked task in Phase 1 (or the phase I name).
Use TDD. Do not edit old migrations. Run the task’s tests before marking done.
Commit only if I ask.
```

### Prompt P1 — Phase 1 kickoff

```text
Start Phase 1 of docs/superpowers/plans/2026-07-18-skill-tree-frontier.md.
Work Tasks 1→7 in order with subagent-driven-development.
Stop after Task 7 verify. Summarize what shipped and any compatibility risks.
```

### Prompt T1 — Unlock + graph pure

```text
Implement Task 1 only from the skill-tree-frontier plan: pure graph + unlock + tests.
No UI. No migrations. Keep MasteryNodeState semantics.
```

### Prompt T2 — Prerequisite seed DAG

```text
Implement Task 2 only: ap-calc-ab-skill-prereqs.json + seed/verify updates.
Must keep all current CED nodes. DAG must be acyclic. Linear edges may remain as subset.
```

### Prompt T3 — loadSkillTree

```text
Implement Task 3 only: loadSkillTree sharing loadMasteryGrid internals.
Must still be able to produce MasteryGridData for hub/post-pack.
```

### Prompt T4 — Quest gate

```text
Implement Task 4 only: assertNodeUnlocked on practice start for AP Calc AB.
Locked → brief error. Do not change VFA writes.
```

### Prompt T5 — Frontier UI

```text
Implement Task 5 only: Frontier Tree canvas with framer-motion + d3.
Icon-first MentrixaVocabIcon. Ambient edges + Next pulse. Reduced motion support.
All skills accordion keeps existing MasteryGridExplorer as subset.
```

### Prompt T6 — Hub + post-pack

```text
Implement Task 6 only: hub card + post-pack Opened highlight when children unlock.
Do not break MasteryGridData consumers.
```

### Prompt T7 — Phase 1 verify

```text
Run Task 7 verify checklist from the skill-tree-frontier plan.
Fix any failures. Do not start Phase 2.
```

### Prompt P2 — Phase 2 kickoff

```text
Phase 1 is done. Execute Phase 2 Tasks 8→10 (failure tags + error events + routing).
Reviewed tags only. No live Gemini.
```

### Prompt P3 — Phase 3 kickoff

```text
Execute Phase 3 Tasks 11→12 (decay on frontier + Review Open).
Reuse mastery-decay; no random attack events.
```

### Prompt P4 — Phase 4 kickoff

```text
Execute Phase 4 Tasks 13→14 (Mistake Treasury + Phoenix XP).
Brief icon copy only. No decorative gold.
```

### Prompt P5 — Phase 5 kickoff

```text
Execute Phase 5 Tasks 15→17 (latency + Faster verdict + challenge difficulty all formats).
Never surface Elo as rank.
```

### Prompt FIX — Regression / edge case

```text
Bug on skill tree frontier: <paste repro>.
Read the Edge cases section of the design spec.
Fix with a pure test first. Preserve subset compatibility with MasteryGridData.
```

### Prompt AUDIT — Compatibility audit

```text
Audit whether current mastery-grid is still a subset of skill-tree.
Check: node IDs, states, loadMasteryGrid, hub card, seed verify, unlock gate.
Report gaps only; then fix blockers.
```

---

# Phase 1 — DAG + Frontier + gate

### Task 1: Graph + unlock pure (TDD)

**Files:**
- Create: `src/features/skill-tree/types.ts`
- Create: `src/features/skill-tree/skill-tree-graph-pure.ts`
- Create: `src/features/skill-tree/skill-tree-unlock-pure.ts`
- Create: `src/features/skill-tree/skill-tree-frontier-pure.ts`
- Create: `src/features/skill-tree/skill-tree-copy-pure.ts`
- Test: `src/features/skill-tree/skill-tree-unlock-pure.test.ts`
- Test: `src/features/skill-tree/skill-tree-frontier-pure.test.ts`
- Test: `src/features/skill-tree/skill-tree-graph-pure.test.ts`

**Interfaces:**
- Produces:
  - `type SkillTreeEdge = { parentId: string; childId: string }`
  - `buildAdjacency(nodes: { id: string; prerequisites: string[] }[]): { parents: Map<string, string[]>; children: Map<string, string[]> }`
  - `findCycle(nodes): string[] | null`
  - `isSolidState(state: MasteryNodeState): boolean` — true for `proficient` | `verified`
  - `isNodeUnlocked(nodeId, parents, solidIds: Set<string>): boolean`
  - `buildSolidIds(nodes: { id: string; state: MasteryNodeState }[]): Set<string>`
  - `buildFrontier(input: { focusId: string; parents; children; states; unlocked; maxChildren?: number }): FrontierView`
  - `skillTreeLabel(kind: SkillTreeLabelKind): { icon: VocabIconName; text: string }`

- [ ] **Step 1: Write failing unlock tests**

```ts
import { describe, expect, it } from "vitest";
import {
  buildSolidIds,
  isNodeUnlocked,
  isSolidState,
} from "@/features/skill-tree/skill-tree-unlock-pure";

describe("skill-tree unlock", () => {
  it("roots with no parents are unlocked", () => {
    expect(isNodeUnlocked("a", new Map([["a", []]]), new Set())).toBe(true);
  });

  it("requires every parent to be solid", () => {
    const parents = new Map([["c", ["a", "b"]]]);
    expect(isNodeUnlocked("c", parents, new Set(["a"]))).toBe(false);
    expect(isNodeUnlocked("c", parents, new Set(["a", "b"]))).toBe(true);
  });

  it("verified incorrect is not solid", () => {
    expect(isSolidState("weak")).toBe(false);
    expect(isSolidState("proficient")).toBe(true);
    expect(isSolidState("verified")).toBe(true);
  });

  it("buildSolidIds includes proficient and verified only", () => {
    const ids = buildSolidIds([
      { id: "1", state: "none" },
      { id: "2", state: "weak" },
      { id: "3", state: "proficient" },
      { id: "4", state: "verified" },
    ]);
    expect([...ids].sort()).toEqual(["3", "4"]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/features/skill-tree/skill-tree-unlock-pure.test.ts
```

- [ ] **Step 3: Implement unlock + graph + frontier + copy pure modules**

Unlock rules:
- Missing parent id in `solidIds` → locked  
- Empty parents → unlocked  
- `verified` and `proficient` are Solid; `weak` and `none` are not  

Frontier rules:
- Include focus, its parents, its children (default max 3)  
- Mark each node `unlocked` boolean  
- Prefer unlocked children first in display order when sorting  

Copy map (exact):

| kind | icon | text |
|---|---|---|
| next | focus-ring | Next |
| open | quest | Open |
| solid | practice-pack | Solid |
| weak | practice-pack | Weak |
| locked | skills | Locked |
| review | retest | Review |
| opened | breakthrough | Opened |
| clearMisses | practice-pack | Clear misses |
| recovered | xp | Recovered |
| faster | momentum | Faster |

- [ ] **Step 4: Cycle detection test**

```ts
it("findCycle returns path when prerequisites loop", () => {
  const cycle = findCycle([
    { id: "a", prerequisites: ["c"] },
    { id: "b", prerequisites: ["a"] },
    { id: "c", prerequisites: ["b"] },
  ]);
  expect(cycle).not.toBeNull();
});
```

- [ ] **Step 5: Run all skill-tree pure tests — expect PASS**

```bash
npx vitest run src/features/skill-tree
```

- [ ] **Step 6: Commit only if user asked**

---

### Task 2: Real prerequisite seed (superset of linear edges)

**Files:**
- Create: `scripts/data/ap-calc-ab-skill-prereqs.json`
- Modify: `scripts/seed-ap-calc-ab-skill-tree.ts`
- Modify: `scripts/verify-ap-calc-skill-tree.ts`
- Optional test: `scripts/ap-calc-ab-skill-prereqs.test.ts`

**Shape of JSON:**

```json
{
  "chain-rule": ["product-rule", "composition-basics-slug"],
  "integration-by-parts": ["u-substitution", "product-rule"]
}
```

Keys and values are `node_slug` strings that **must** exist in `ap-calc-ab-skill-nodes.json`.

- [ ] **Step 1: Author prereq JSON covering meaningful DAG edges**

Minimum coverage:
- Keep within-unit linear chain as default fallback when slug missing from JSON  
- Add cross-cutting edges for: limits→definition of derivative; product/quotient/chain; u-sub; FTC applications  
- Do not remove any CED node  

- [ ] **Step 2: Update seed script**

After upserting nodes:
1. Build slug→id map  
2. For each node, prerequisites = JSON list if present, else previous linear within-unit fallback  
3. Refuse to write if `findCycle` would fail  

- [ ] **Step 3: Update verify script**

Assert:
- Node count in 100–150  
- Every prereq slug resolves  
- `findCycle` is null  
- Every current seed slug still in DB when env present  

- [ ] **Step 4: Run**

```bash
npx vitest run scripts/ap-calc-ab-skill-nodes.test.ts
npx tsx scripts/verify-ap-calc-skill-tree.ts
```

(If DB env missing, seed-file checks still must pass.)

---

### Task 3: loadSkillTree (grid remains available)

**Files:**
- Create: `src/features/skill-tree/load-skill-tree.ts`
- Modify if needed: `src/features/mastery-grid/load-mastery-grid.ts` (extract shared fetch, do not break API)
- Test: `src/features/skill-tree/load-skill-tree.test.ts` (pure mapping test with fixtures; mock DB optional)

**Produces:**

```ts
export type SkillTreeData = {
  subject: string;
  grid: MasteryGridData; // full subset for hub / All skills
  nodes: Array<{
    id: string;
    nodeName: string;
    nodeSlug: string;
    unitNumber: number;
    unitName: string;
    displayOrder: number;
    state: MasteryNodeState;
    prerequisites: string[];
    unlocked: boolean;
    nextReviewAt: string | null;
  }>;
  frontier: FrontierView;
  focusNodeId: string;
};
```

Focus selection order:
1. Primary weakest attempted unlocked node if any  
2. Else first unlocked `none`/`weak` by display_order  
3. Else first unit-1 root  

- [ ] **Step 1: Fixture test that grid.units node ids === tree.nodes ids**  
- [ ] **Step 2: Implement load using admin client same as mastery grid**  
- [ ] **Step 3: Include `prerequisites` + `next_review_at` from knowledge rows**  
- [ ] **Step 4: Ensure `loadMasteryGrid` public signature unchanged**

---

### Task 4: Server gate on practice

**Files:**
- Create: `src/features/skill-tree/assert-node-unlocked.ts`
- Modify: `src/features/quest/practice-quest.ts` (start pack / node targeting paths)
- Modify: item selector entry if packs choose nodes before start
- Test: `src/features/skill-tree/assert-node-unlocked.test.ts` (pure with injected solid set) + targeted practice test if exists

**Behavior:**
- Student role: if any targeted `skill_node_id` is locked → `{ error: "Locked. Open prior skill." }`  
- Do not alter VFA insert path  
- Duels: filter candidate nodes to unlocked only (document in code comment)

Edge cases from spec: 11–15.

- [ ] **Step 1: Pure tests for assert helper**  
- [ ] **Step 2: Wire into practice start**  
- [ ] **Step 3: Manual reasoning check: unlocked root still starts**  

---

### Task 5: Frontier Tree UI (primary) + All skills (subset)

**Files:**
- Create: `src/features/skill-tree/skill-tree-canvas.tsx`
- Create: `src/features/skill-tree/skill-tree-node.tsx`
- Create: `src/features/skill-tree/skill-tree-edge.tsx`
- Create: `src/features/skill-tree/skill-tree-page-client.tsx`
- Modify: `src/app/(app)/student/mastery/page.tsx`
- Keep: `MasteryGridExplorer` mounted under All skills disclosure

**UX requirements:**
- Primary: Frontier canvas  
- Ambient edge animation (framer-motion pathLength / dashOffset loop)  
- Next node pulse  
- Unlock bloom when `unlocked` flips true in session (compare prev props)  
- Unit trunk chips open unit branch overlay/sheet then collapse  
- CTA Open uses `practiceNodeHref` / existing quest routes  
- `useReducedMotion()` → disable loops  
- Icons only from MentrixaVocabIcon  

- [ ] **Step 1: Page loads `loadSkillTree`, passes to client**  
- [ ] **Step 2: Canvas renders frontier nodes + edges**  
- [ ] **Step 3: All skills renders existing explorer with `data={tree.grid}`**  
- [ ] **Step 4: History panel stays above or below per current page**  
- [ ] **Step 5: Mobile layout check (narrow width)**  

---

### Task 6: Hub + post-pack Opened

**Files:**
- Modify: `src/features/mastery-grid/mastery-grid-hub-card.tsx` (optional Next line via frontier helper from grid weakest)  
- Modify: `src/features/quest/quest-post-step-pure.ts` and/or mastery done panel  
- Test: extend `mastery-grid` / quest-post-step tests for “Opened” when child becomes unlocked after Solid  

**Behavior:**
- When pack causes parent → Solid and a child becomes newly unlocked, highlight kind `opened` with `breakthrough` icon and text `Opened`  
- Still emit existing mastery highlight when state changes  

---

### Task 7: Phase 1 verify

- [ ] `npx vitest run src/features/skill-tree src/features/mastery-grid src/features/quest/quest-post-step-pure.ts` (and related tests)  
- [ ] `npx tsc --noEmit`  
- [ ] `npx tsx scripts/verify-ap-calc-skill-tree.ts`  
- [ ] Manual checklist:
  - [ ] Roots open  
  - [ ] Child locked until parent Solid  
  - [ ] Server rejects locked pack  
  - [ ] All skills shows full grid subset  
  - [ ] Verified gold only on verified nodes  
  - [ ] Reduced motion calm  
  - [ ] Hub still renders  

**Phase 1 ship gate:** Do not start Phase 2 until this passes.

---

# Phase 2 — Failure tags + routing

### Task 8: Secondary skill tags on items

**Files:**
- Create migration: `supabase/175-item-secondary-skill-tags.sql` (number = next free after latest; verify before writing)  
- Modify admin item review if present  
- Seed pilot tags on a small Chain Rule / Product Rule set via script or reviewed SQL seed  

```sql
-- illustrative; adjust number to next migration
ALTER TABLE public.item_bank
  ADD COLUMN IF NOT EXISTS secondary_skill_tags text[] NOT NULL DEFAULT '{}';
```

- [ ] RLS unchanged on item_bank (already covered)  
- [ ] `npm run types:generate`  
- [ ] No live Gemini tag generation in product path  

### Task 9: skill_error_events

**Files:**
- Create migration `supabase/176-skill-error-events.sql` (adjust number)  
- Create: `src/features/skill-tree/record-skill-error.ts`  
- Create: `src/features/skill-tree/skill-error-aggregate-pure.ts`  
- Wire wrong answers in practice / diagnostic to record distractor tag + secondary tags  

Schema sketch:
- `id uuid pk`  
- `user_id uuid not null`  
- `skill_node_id uuid not null`  
- `item_id uuid`  
- `failure_tag text`  
- `secondary_tags text[]`  
- `created_at timestamptz`  
- RLS: select own; writes service/action only  

Edge cases 21–22.

### Task 10: Route Next to cause

**Files:**
- Modify: `skill-tree-frontier-pure.ts` / verdict builders  
- Test: secondary deficit unlocked → prefer that node; if locked → nearest unlocked ancestor  

- [ ] Brief copy only: icon `skills` + node short name  

---

# Phase 3 — Decay on tree

### Task 11: Show Review on frontier

**Files:**
- Modify: `load-skill-tree.ts`, `skill-tree-node.tsx`, `skill-tree-copy-pure.ts`  
- Due if `nextReviewAt <= now` or within 24h window (match decay alert window)  

### Task 12: Open Review

**Files:**
- CTA on review node uses existing `decayAlertQuestUrl` / practice href  
- No new random event system  

---

# Phase 4 — Mistake Treasury + Phoenix

### Task 13: Clear misses

**Files:**
- Migration or derived queue from wrong attempts + error events  
- UI entry on tree page: Clear misses  
- Pack builder restricts to miss item IDs from reviewed bank  
- Hide when empty (edge 24)  

### Task 14: Phoenix

**Files:**
- Pure: detect ≥5 consecutive incorrect then later Solid  
- Award XP once per recovery key `(user_id, skill_node_id, recovery_at_day)`  
- Verdict `Recovered` + `xp` icon  

---

# Phase 5 — Velocity + adaptive depth

### Task 15: Latency column

**Files:**
- New migration on practice answer table (discover actual table name in codebase before writing)  
- Client sends `answeredMs`; Zod clamp 0..1_800_000  
- Ignore nulls  

### Task 16: Faster verdict

**Files:**
- Pure median helper  
- Post-pack: if samples ≥5 and median drop ≥30%, show `Faster`  
- Edge 27  

### Task 17: Challenge difficulty all formats

**Files:**
- Extend `applyChallengeDifficultyOutcome` call sites beyond free response  
- Keep ratings hidden from student UI  

---

# Rollback / feature flag (optional but recommended)

If needed for safe prod:

- Env `SKILL_TREE_FRONTIER=1` on mastery page chooses canvas vs explorer-only  
- Gate can ship behind same flag  
- Default: on for new builds once Phase 1 verified locally  

Flag must not fork data model; only UI + gate enforcement.

---

# Edge case test matrix (copy into QA)

| # | Case | Expected |
|---|---|---|
| 1 | Root node | Unlocked always |
| 2 | Two parents, one Solid | Child locked |
| 3 | Both parents Solid | Child unlocked + bloom |
| 4 | VFA wrong | weak; not Solid; no unlock |
| 5 | VFA right | verified gold; Solid; unlocks children |
| 6 | Cyclic seed | verify script fails |
| 7 | Bad prereq UUID | locked + server log |
| 8 | Deep link locked | error string Locked… |
| 9 | Duel pool | unlocked nodes only |
| 10 | Reduced motion | no ambient loop |
| 11 | All skills open | full CED grid subset |
| 12 | Search locked node | Locked, no pack start |
| 13 | Secondary tag locked | route to unlocked ancestor |
| 14 | Empty misses | no Clear misses CTA |
| 15 | Latency outlier | clamped / excluded |
| 16 | loadMasteryGrid | identical node id set |

---

# Definition of done (whole program)

1. Frontier Tree is primary on `/student/mastery`  
2. All skills still shows complete current grid  
3. DAG prereqs acyclic and seeded  
4. Practice gate enforced server-side  
5. Phases 2–5 shipped or explicitly deferred with tickets  
6. Spec + this plan remain accurate  
7. No VFA/rank regressions  
8. Copy/icon rules held  

---

# Suggested git commit messages (when user asks to commit)

- `feat(skill-tree): pure unlock and frontier view models`  
- `feat(skill-tree): seed acyclic AP Calc prerequisite DAG`  
- `feat(skill-tree): loadSkillTree with MasteryGrid subset`  
- `feat(skill-tree): gate practice packs on Solid parents`  
- `feat(skill-tree): animated frontier canvas on mastery`  
- `feat(skill-tree): opened highlight and hub next affordance`  
- `feat(skill-tree): error events and secondary tag routing`  
- `feat(skill-tree): review affordance from decay schedule`  
- `feat(skill-tree): mistake treasury and phoenix recovery xp`  
- `feat(skill-tree): answer latency and faster verdicts`  

---

# Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-skill-tree-frontier.md`.  
Design spec: `docs/superpowers/specs/2026-07-18-skill-tree-frontier-design.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session runs tasks with checkpoints  

Paste **Prompt P1** to start Phase 1, or say which option you want.
