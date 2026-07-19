# Post-quest pack complete letter note

**Date:** 2026-07-18  
**Product:** mentrixa.one  
**Status:** Approved (Approach A + envelope tray)

## Goal

After an 8-question practice pack finishes, present the existing Pack Complete content as a Mentrixa-branded letter that slides out of an envelope. The letter is draggable until the student clicks one of the three CTAs. Same copy and routes; better presentation.

## Decisions

| Topic | Choice |
|-------|--------|
| Reveal | Envelope slide-out (Hack the North inspired motion) |
| After reveal | Envelope stays as a fixed resting tray; letter can drag |
| Content | Keep Pack complete / Worked on / accuracy·XP / verdict / 3 CTAs |
| Motion | Framer Motion (`framer-motion` already in app) |
| Colors | Mentrixa only: violet `#7C3AED`, indigo `#6366F1`, navy ink `#0B1220`, cream paper; gold only if verified percentile is shown |
| Icons | Public Mentrixa vocab icons via `MentrixaVocabIcon`, on contrasting backdrops |
| Logo | Mentrixa mark on letter header |

## Non-goals

- Clouds / island / social share scene from the reference
- Changing verdict copy or CTA href logic
- Guest diagnostic results rewrite

## Architecture

1. `QuestPackCompleteLetter` — envelope shell + draggable cream letter; owns enter animation and drag constraints.
2. `QuestMasteryDonePanel` — existing text/CTAs, wrapped by the letter; adds vocab icons beside labels and CTAs.

## Interaction

- Letter animates up out of the envelope once on mount.
- Drag anywhere on letter chrome; CTAs call `stopPropagation` on pointer down so links stay clickable.
- `prefers-reduced-motion`: skip slide; show settled letter immediately.
- Leaving via any CTA navigates away (current Link behavior); no extra dismiss control.

## Icon map (contrasting chips)

| Spot | Icon | Backdrop |
|------|------|----------|
| Pack complete | `quest` | violet chip on cream |
| Worked on | `skills` | indigo chip |
| Accuracy | `focus-ring` | light indigo |
| Verified percentile | `verified` | gold only when percentile present |
| XP | `xp` | indigo chip (existing light-surface rule) |
| Primary CTA | `practice-pack` or `quest` from label | white icon treatment on violet button |
| Skill tree | `mastery-grid` | navy/indigo chip on white button |
| Home | `home` | indigo chip on ghost |

## Touch points

- `src/features/mastery-grid/quest-pack-complete-letter.tsx` (new)
- `src/features/mastery-grid/quest-mastery-done-panel.tsx` (wrap + icons)
