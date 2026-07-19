# Task 3 Report: loadSkillTree

## Status

Completed Task 3 on `feat/skill-tree-frontier`.

Commit: `feat(skill-tree): loadSkillTree with MasteryGrid subset`

## Delivered

Added `SkillTreeData` and `SkillTreeNode` types. `loadSkillTree(userId)` now
returns the unchanged full `MasteryGridData` as `grid`, plus prerequisite,
unlock, review, focus, and frontier metadata.

The pure `buildSkillTreeData` projection:

1. Uses the mastery grid as the source of node IDs, names, units, and states.
2. Preserves the grid's flattened node order exactly in `tree.nodes`.
3. Treats only `proficient` and `verified` states as Solid for unlocks.
4. Requires every prerequisite to be Solid.
5. Includes `next_review_at` from student knowledge rows.
6. Selects focus in the required weakest-attempted, open-node, unit-1-root order.
7. Builds the focus frontier with the existing pure graph/frontier helpers.

`loadMasteryGrid(userId)` and its rank/VFA behavior were not changed.

## Automated tests

TDD red states were observed before implementation and for exact grid-order
preservation. Final verification:

```text
npx vitest run src/features/skill-tree src/features/mastery-grid
6 test files passed, 33 tests passed

npx tsc --noEmit
Exit code 0

npx eslint src/features/skill-tree/load-skill-tree.ts src/features/skill-tree/load-skill-tree.test.ts src/features/skill-tree/types.ts
Exit code 0
```

The loader fixture verifies exact equality between flattened grid node IDs and
tree node IDs, review-date mapping, locked descendants, and weakest unlocked
focus selection.

## Concerns

No live Supabase integration test was run. The loader uses the same admin-client
query pattern as the mastery grid, while the mapping and unlock behavior are
covered by pure fixtures.

## Verdict

Task 3 is complete: the full mastery grid remains available unchanged inside
the skill-tree response, and frontier metadata is derived without altering VFA
or rank logic. The next action is Task 4's server-side practice gate.
