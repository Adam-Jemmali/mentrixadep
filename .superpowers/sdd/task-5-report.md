# Task 5 Report: Frontier Tree UI

## Status

Completed Task 5 on `feat/skill-tree-frontier`.

Commit: `feat(skill-tree): animated frontier canvas on mastery`

## Delivered

1. Replaced the primary mastery grid with a focused Frontier canvas that renders
   only the current node, its parents, and up to three children.
2. Added animated SVG edge drift, a pulsing Next node, and one-time unlock bloom.
   All repeating and bloom motion stops when reduced motion is preferred.
3. Added mobile and desktop frontier layouts with icon-first node states,
   locked-node handling, verified-only gold, and quest links through
   `practiceNodeHref`.
4. Added horizontally scrollable unit trunks. Each trunk opens a responsive unit
   branch sheet and Collapse returns to the frontier.
5. Kept `MasteryGridExplorer` mounted inside a collapsed All skills disclosure
   using `tree.grid`, and retained the existing history panel.
6. Updated the mastery route to load the shared `loadSkillTree` result while
   preserving entitlement and history loading.

## Automated verification

```text
npx vitest run src/features/skill-tree
6 test files passed, 27 tests passed

npx tsc --noEmit
Exit code 0

npx eslint <Task 5 changed files>
Exit code 0

git diff --check
Exit code 0
```

## Concerns

No authenticated browser fixture was available for a live data visual check.
Responsive layout, keyboard focus styling, Escape-to-collapse, and reduced motion
are implemented in code and compile cleanly.

## Verdict

The Frontier Tree is now the primary mastery surface without removing the full
AP Calculus AB grid or history. The next action is review and visual QA before
starting Task 6.

## Review fixes

1. Bloom now starts and renders only when reduced motion is off. A preference
   change clears bloom state, and the unlock timeout is cleaned up.
2. Replaced the cyan bloom border with the indigo brand token `#6366F1`.
3. Unit trunks now use an AP Calculus AB short-label map capped at four words.
4. Unit dialogs focus Collapse on open, close on Escape or backdrop click, and
   restore focus to the opening unit trunk.
5. Added pure regression coverage for bloom eligibility and reduced-motion
   changes, plus coverage for the unit-label word limit.

## Review-fix verification

```text
npx vitest run src/features/skill-tree src/features/quest/ap-calc-unit-labels-pure.test.ts
8 test files passed, 33 tests passed

npx eslint src/features/skill-tree/skill-tree-node.tsx src/features/skill-tree/skill-tree-page-client.tsx src/features/skill-tree/skill-tree-canvas.tsx src/features/skill-tree/skill-tree-motion-pure.ts src/features/skill-tree/skill-tree-motion-pure.test.ts src/features/quest/ap-calc-unit-labels-pure.ts src/features/quest/ap-calc-unit-labels-pure.test.ts
Exit code 0

npx tsc --noEmit
Exit code 0

git diff --check
Exit code 0
```

The Task 5 review findings are resolved. The next action is to review commit
`fix(skill-tree): frontier motion tokens and a11y`.
