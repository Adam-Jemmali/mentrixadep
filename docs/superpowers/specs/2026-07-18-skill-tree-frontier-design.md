# Skill Tree Frontier (superset of Mastery Grid)

**Date:** 2026-07-18  
**Product:** mentrixa.one  
**Status:** Approved for planning  
**Plan:** `docs/superpowers/plans/2026-07-18-skill-tree-frontier.md`

## Goal

Replace the flat unit accordion as the **primary** skill surface with an animated Frontier Tree, while keeping the current Mastery Grid as a **full subset** of the same data model, loaders, and node set. Every existing AP Calculus AB skill node, state, VFA row, and hub consumer keeps working. The new system adds DAG locks, ambient graph motion, icon-brief copy, failure routing, decay on-tree, miss clearing, and solve-time velocity.

## Identity fit

Every tree screen answers: **what is true about me right now that was not true yesterday, compared to someone real.**

Unlocks, reviews, recoveries, and speed gains must end in a **verdict + next action**. Gold remains verified truth only.

## Compatibility rule (non-negotiable)

**Current skill tree ⊆ new skill tree.**

| Current asset | Relationship to new system |
|---|---|
| `skill_nodes` CED seed (~100–150) | Same table, same slugs, same units. No node deletion. |
| `MasteryNodeState` none / weak / proficient / verified | Same four states. Solid = proficient or verified for unlock. |
| `loadMasteryGrid` | Kept. Prefer deriving grid from shared loader internals, or call grid from tree load. |
| Unit accordion grid UI | Becomes secondary **All skills** view inside the tree page (collapsed by default). |
| Hub `MasteryGridHubCard` | Can keep using `MasteryGridData`; optionally show Next from frontier helpers. |
| `prerequisites uuid[]` | Kept. Seed upgrades from linear-within-unit to real DAG. Empty prereqs still mean root. |
| VFA / rank / gold | Untouched. Practice unlock ≠ verified. |
| Quest / duels / diagnostics node IDs | Same IDs. Gate only adds lock checks. |
| Decay `next_review_at` | Surfaced on tree; cron unchanged in spirit. |

If a change would break `loadMasteryGrid`, hub cards, post-pack highlights, or seed verify scripts, it is out of order until adapters restore parity.

## Decisions

| Topic | Choice |
|---|---|
| Primary UX | Frontier Tree: focus + parents + next fork (≤3 children) |
| Expand | Tap `unit` trunk opens that unit branch; collapse returns to frontier |
| Unlock rule | All parents **Solid** (practice accuracy ≥70% **or** verified correct) |
| Locked practice | Server rejects Quest start / pack targeting locked nodes |
| Rank | VFA only. Hidden challenge difficulty never shown as rank |
| Motion | Ambient edge drift + Next pulse always on; unlock bloom once; honor `prefers-reduced-motion` |
| Copy | Icon first via `MentrixaVocabIcon` / `/public/icons/vocab/`. ≤4 words. No hyphen bullets. No emoji |
| Failure engine | Reviewed tags only. No live Gemini diagnosis |
| Decay events | Scheduled Review from Ebbinghaus. No random “under attack” |
| Mistake loop | Mistake Treasury (“Clear misses”), not loot dungeon chrome |
| Phoenix | XP + verdict after ≥5 consecutive fails then Solid |
| Velocity | Answer latency logged; “Faster” verdict when median improves |
| Subject | AP Calculus AB only |

## Non-goals

- Public Elo / difficulty as Mentrixer rank
- Deleting or renaming CED nodes casually
- Paywalling Mastery / Arena / public rank
- Live Gemini quiz or coaching answers
- Decorative gold
- Showing all ~100 nodes on first paint
- Replacing Guide Impact Score mechanics

## UX summary

```
[unit trunks row]
        │
   [parent Solid] ── [FOCUS Next] ── [child Locked]
                         │
                    [quest Open]
```

States map to icons:

| State | Icon | Label |
|---|---|---|
| Next / focus open | `focus-ring` | `Next` |
| Weak | `practice-pack` | `Weak` |
| Solid (proficient) | `practice-pack` | `Solid` |
| Verified | `verified` | (icon only, gold) |
| Locked | `skills` dim | `Locked` |
| Review due | `retest` | `Review` |
| Unit | `unit` | short unit name |
| CTA | `quest` | `Open` |
| Child unlocked | `breakthrough` | `Opened` |
| Clear misses | `practice-pack` | `Clear misses` |
| Recovered | `xp` | `Recovered` |
| Faster | `momentum` | `Faster` |

## Data model additions (new migrations only)

Phase 1 may need **no** new tables if unlock is computed from existing knowledge + VFA + `prerequisites`.

Later phases:

1. `skill_error_events` (or equivalent) for tagged misses  
2. Optional `item_bank.secondary_skill_tags text[]` if authoring_meta is insufficient  
3. Answer latency column(s) on practice answer storage  
4. Mistake treasury queue table or derived view  

RLS on every new table. `npm run types:generate` after schema changes.

## Edge cases (must handle)

### Unlock / DAG

1. **Root nodes** (`prerequisites = {}`): always unlocked.  
2. **Multi-parent**: unlock only when **every** parent is Solid.  
3. **Verified incorrect**: state is `weak` for display; does **not** count as Solid; does **not** unlock children. Practice can still raise to proficient and unlock.  
4. **Verified correct**: counts as Solid for unlock; gold square; rank unchanged by practice after.  
5. **Cycles in seed**: seed/verify script fails hard. Never ship cyclic prereqs.  
6. **Orphan prereq UUID**: treat as missing parent → node stays locked; log server warning.  
7. **Empty tree / load failure**: keep current mastery empty copy.  
8. **Linear legacy edges**: still valid subset of DAG. New edges only add parents.  
9. **Cross-unit edges**: allowed (e.g. Product Rule → Chain Rule). Unit trunks still group display.  
10. **Branching**: two children of one parent both lock independently until that parent is Solid.

### Practice gate

11. **Deep link to locked node**: server returns brief error; client shows Locked + Open parent.  
12. **Race**: student hits Solid mid-request; gate re-reads Solid set at request time.  
13. **Admin / tutor tooling**: do not bypass student gate for student role.  
14. **Duels**: if duel assigns a locked node, either filter to unlocked pool or allow duel-only exception documented in plan Task for duels (default: **filter to unlocked** so tree stays honest).  
15. **Guest try**: unchanged; no full tree gate.

### UI / motion

16. **`prefers-reduced-motion`**: no edge drift, no pulse; instant layout.  
17. **Mobile**: one focus node, pan/zoom limited; CTA thumb-reachable.  
18. **Long node names**: truncate with title attribute; icon always visible.  
19. **Zero children**: frontier shows focus + parents only; next action = All skills or Review.  
20. **Search**: reuse grid search inside All skills accordion; selecting a locked node shows Locked, not Open pack.

### Failures / decay / treasury / velocity (later phases)

21. **Missing distractor tag**: log miss without secondary routing.  
22. **Secondary tag points at locked node**: suggest unlocked ancestor or parent practice first.  
23. **Decay on never-practiced**: no alert (already handled by decay eligibility).  
24. **Clear misses empty**: hide CTA.  
25. **Phoenix once per recovery streak**: idempotent award key.  
26. **Latency spoof**: clamp 0–30 min; ignore outliers for median.  
27. **Insufficient samples**: no Faster verdict until N≥5 on node.

## Testing bar

- Pure unlock / frontier / copy unit tests  
- Seed verify: count range, acyclic DAG, all current slugs present  
- Gate integration: locked reject / Solid allow  
- Mastery grid loader still returns same node IDs and states  
- Reduced motion snapshot or flag test  
- `npx tsc --noEmit` + targeted vitest before each phase ship  

## Success metrics (product)

- Students cannot start packs on locked advanced nodes  
- Time-to-first-Solid on Unit 1 roots remains low (roots open)  
- Post-pack “Opened” events visible when children unlock  
- Hub and post-pack consumers still compile against `MasteryGridData`  

## Out of scope reminders

Kill list still applies: no screenshot-to-answer, no non–AP Calc practice picker expansion, no paywalled Mastery.
