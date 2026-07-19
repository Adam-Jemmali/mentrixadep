# Task 6 Report: Hub + post-pack Opened

## Status

Completed Task 6 on `feat/skill-tree-frontier`.

Commit: `feat(skill-tree): opened highlight and hub next affordance`

## Delivered

1. Added a pure unlock-aware post-pack helper that detects children newly opened
   when a pack node changes from non-solid to solid.
2. Reused `skillTreeLabel("opened")` for the `breakthrough` icon and `Opened`
   text, plus the graph and unlock helpers for prerequisite checks.
3. Kept the existing mastery-state highlight as a separate result so a parent
   becoming Solid and its newly opened child are both emitted.
4. Added the Opened callout to the post-pack completion letter and threaded the
   additive result through existing quest types without changing
   `MasteryGridData`.
5. Kept the hub's existing non-compact Next line, which already derives its
   recommendation from the grid's weakest attempted node.

## Automated verification

```text
npx vitest run src/features/quest/quest-post-step-pure.test.ts src/features/skill-tree/skill-tree-copy-pure.test.ts src/features/skill-tree/skill-tree-unlock-pure.test.ts
3 test files passed, 24 tests passed

npx tsc --noEmit
Exit code 0

npx eslint <Task 6 changed files>
Exit code 0

git diff --check
Exit code 0
```

## Concerns

No authenticated browser fixture was available for a live post-pack visual
check. The Opened callout uses the existing indigo light surface and does not
use gold.

## Verdict

Post-pack results now preserve the mastery change and separately show which
child Opened. The next action is review this commit before Task 7 verification.
