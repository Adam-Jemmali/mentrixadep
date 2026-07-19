# Task 4 Report: Server gate on practice

## Status

Completed Task 4 on `feat/skill-tree-frontier`.

Commit: `1181c03 feat(skill-tree): gate practice packs on Solid parents`

## Delivered

1. Added a pure unlock assertion with the exact error
   `Locked. Open prior skill.` and tests for roots, multi-parent nodes, mixed
   packs, and unknown nodes.
2. Practice pack creation now loads current student unlock state, rejects a
   locked focus node, filters automatic item selection to unlocked nodes, and
   verifies every selected target before saving the quest.
3. Practice session start re-reads unlock state and rejects deep links or
   previously created packs containing locked targets.
4. Duel activation intersects unlocked nodes across all human participants.
   Item-bank queries and the pure row filter both prevent locked-node backfill.
5. Admin behavior remains unchanged. Guest try and all rank/VFA write paths
   were not modified.

## Automated tests

The new tests were observed failing before implementation. Final verification:

```text
npx vitest run src/features/skill-tree tests/unit/item-bank-selector.test.ts tests/unit/duel-item-bank.test.ts
8 test files passed, 38 tests passed

npx tsc --noEmit
Exit code 0

npx eslint <Task 4 changed files>
Exit code 0

git diff --check
Exit code 0
```

## Concerns

No live Supabase integration test was run. The server gates use the existing
`loadSkillTree` source of truth, while pure tests cover the exact rejection and
candidate filtering behavior.

## Verdict

Task 4 is complete: student practice and duel targets cannot cross locked
prerequisite boundaries. The next action is Task 5's Frontier UI.

## Important review fix: nested multi-part targets

Commit target: `fix(skill-tree): gate nested multi-part skill nodes`

1. Replaced the question-only collector with
   `collectPracticeSkillNodeIds`, which includes both question-level IDs and
   every `parts[].skillNodeId`, deduplicated in encounter order.
2. Both practice creation and practice session start now pass the complete ID
   set into the existing unlock assertion. VFA insert logic was not changed.
3. Added focused pure coverage for mixed, part-only, duplicate, and empty IDs.
4. Added a mocked `startPracticeSession` regression proving a locked nested
   part returns the exact error `Locked. Open prior skill.`.

Fix verification:

```text
npx vitest run src/features/skill-tree/assert-node-unlocked.test.ts src/features/quest/practice-skill-node-ids-pure.test.ts src/features/quest/practice-quest-start.test.ts tests/unit/item-bank-selector.test.ts tests/unit/duel-item-bank.test.ts
5 test files passed, 22 tests passed

npx tsc --noEmit
Exit code 0

Cursor diagnostics for all four changed TypeScript files
No linter errors found
```

The nested multi-part unlock bypass is closed. The next action is to keep this
regression suite in Task 4 verification.
