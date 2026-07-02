# Mentrixa visual vocabulary — icon rollout plan

Follow this document phase by phase. Each phase ends with a **copy-paste prompt** you give to Cursor (Agent mode). Do not skip acceptance checks between phases.

---

## Non-negotiable rules

1. **Custom SVG only for product vocabulary**  
   Every new icon for Mentrixa concepts (Quest, Duel, Momentum, Receipt, etc.) must be a **hand-authored vector sticker SVG** stored in the repo.  
   **Forbidden for vocabulary icons:** Lucide, Heroicons, Phosphor, Tabler, Font Awesome, AI-generated generic clip-art, or anything that reads as “default React icon library.”

2. **Functional UI may keep minimal Lucide**  
   Chevrons, X close, menu hamburger, mail on contact forms — OK to keep Lucide **only** where the icon is not a product noun. When in doubt, replace with custom SVG.

3. **Gold `#D4A017` is verified truth only**  
   Use gold on: Mentrixer rank, verified percentile, rank proofs, verified grid nodes, Guide Impact Score, Elite Guide rank. Never decorative gold elsewhere.

4. **Student account ranks are frozen**  
   Do **not** redesign or replace these. Reuse existing assets everywhere.

5. **Guide ranks need a new ladder**  
   Five new custom SVG emblems — same craft level as student ranks, but visually distinct (mentor/coach identity, not competitor identity).

6. **One icon per concept**  
   Same SVG (or same React wrapper) everywhere the word appears: nav, hub, landing, pricing, profile, booking.

7. **Verdict + next action stays**  
   Icons augment labels; they do not replace verdict sentences or next actions on score surfaces.

---

## Frozen student rank ladder (DO NOT CHANGE)

| Level | Rank       | SVG asset                    | Inline component              |
|-------|------------|------------------------------|-------------------------------|
| 1     | Wanderer   | `/public/icons/wanderer.svg` | `WandererRankIcon`            |
| 2     | Seeker     | `/public/icons/seeker.svg`   | `SeekerRankIcon`              |
| 3     | Scholar    | `/public/icons/scholar.svg`  | `ScholarRankIcon`             |
| 4     | Contender  | `/public/icons/contender.svg`| `ContenderRankIcon`           |
| 5     | Rival      | `/public/icons/rival.svg`    | `RivalRankIcon`               |
| 6     | Apex       | `/public/icons/apex.svg`     | `ApexRankIcon`                |
| 7     | Mentrixer  | `/public/icons/mentrixer-rank.svg` | `MentrixerRankIcon`     |

Source of truth: `src/features/xp/rank-icons.ts`, `src/features/xp/components/rank-badge-icons.tsx`  
Emblem crop: `RANK_SVG_VIEWBOX = "210 25 260 260"`  
Inline UI size: 48×48 viewBox components in `rank-badge-icons.tsx`

**Landing:** Already uses `/icons/mentrixer.svg` and `/icons/guide.svg` for role paths — keep; extend with full rank orbit where needed.

---

## New Guide rank ladder (CREATE THESE)

Current keys in `src/features/guide-rank/constants.ts`:

| Order | Key           | Label         | Accent color | Notes                                      |
|-------|---------------|---------------|--------------|--------------------------------------------|
| 1     | practitioner  | PRACTITIONER  | `#64748B`    | Entry — first sessions                     |
| 2     | specialist    | SPECIALIST    | `#2563EB`    | Impact ≥ 70                                |
| 3     | expert        | EXPERT        | `#4F46E5`    | Impact ≥ 80                                |
| 4     | master        | MASTER        | `#7C3AED`    | Impact ≥ 90                                |
| 5     | elite         | ELITE         | `#D4A017`    | Top percentile — gold ring like Mentrixer |

**Deliverables per Guide rank:**
- `public/icons/guide-ranks/{key}.svg` — full emblem (match student rank SVG style: rings, geometric, sticker feel)
- `src/features/guide-rank/components/guide-rank-icons.tsx` — 48×48 inline React SVG mirrors (like `rank-badge-icons.tsx`)
- Update `guide-rank-badge.tsx` to render emblem instead of text-only badge
- Wire into tutor profile, tutor command center, booking browser, landing “For Guides” path

**Visual direction (Guide ≠ Mentrixer):**  
Student ranks = compass, lens, laurel, duel, crown, apex peak, gold Mentrixer sun.  
Guide ranks = **teaching craft**: torch → focused beam → calibrated dial → mastery seal → gold **Impact** halo (not copy Mentrixer sun).

---

## Target file structure

```
public/icons/
  wanderer.svg … mentrixer-rank.svg     # FROZEN student ranks
  mentrixer.svg guide.svg               # FROZEN landing role marks
  vocab/                                # NEW product vocabulary (sticker SVGs)
    quest.svg
    duel.svg
    arena.svg
    league.svg
    skills.svg
    mastery-grid.svg
    skill-node.svg
    unit.svg
    verified.svg
    rank-proof.svg
    session.svg
    guide-session.svg
    breakthrough.svg
    momentum.svg
    momentum-pack.svg
    receipt.svg
    movement-receipt.svg
    loop-report.svg
    loop-sla.svg
    credit.svg
    retest.svg
    impact-score.svg
    streak.svg
    xp.svg
    percentile.svg
    practice-pack.svg
    brief.svg
    study-package.svg
    rival.svg
    goal.svg
    snapshot.svg
    archive.svg
    trajectory.svg
    focus-ring.svg
    passport.svg
  guide-ranks/
    practitioner.svg
    specialist.svg
    expert.svg
    master.svg
    elite.svg

src/shared/icons/
  mentrixa-vocab-icons.tsx              # React wrappers, imports from /public or inline SVG
  mentrixa-vocab-map.ts                 # term → component + label + gold? + size variants

src/features/guide-rank/components/
  guide-rank-icons.tsx                  # NEW — parallel to rank-badge-icons.tsx
```

---

## Sticker SVG design spec (match existing ranks)

When authoring new SVGs, follow what `wanderer.svg` already does:

- **Geometry:** Stroke-first, limited fills, rounded caps, concentric rings where appropriate
- **ViewBox:** Vocabulary icons: `0 0 48 48` for UI; hero/landing variants: `0 0 96 96` optional
- **Color:** Single `stroke`/`fill` passed via CSS `currentColor` OR explicit hex matching token table
- **No gradients** unless Mentrixer/Elite gold (subtle)
- **No photographic texture, no 3D AI gloss**
- **Accessible:** `role="img"` + `aria-label` on standalone SVG files; decorative inline uses `aria-hidden`
- **Sticker feel:** Slightly bold stroke (1.75–2.25), small inner detail, readable at 16px

Brand tokens:

| Token        | Hex       | Use                          |
|--------------|-----------|------------------------------|
| Primary violet | `#7C3AED` | Brand, CTAs                  |
| Indigo accent  | `#6366F1` | Secondary                    |
| Dark navy      | `#0B1220` / `#0F172A` | Shells           |
| Gold verified  | `#D4A017` | Verified truth only          |
| Cyan           | `#22D3EE` | Landing hero, focus ring only |

---

## Full vocabulary checklist (icon each term once)

Use this as the master checklist. Mark done in Phase 8.

### Navigation & shell
- [ ] Home
- [ ] Skills (→ mastery)
- [ ] Quest
- [ ] League
- [ ] Duels
- [ ] Profile
- [ ] Momentum membership

### Core mechanics
- [ ] Mastery Grid
- [ ] Skill tree
- [ ] Skill node
- [ ] Unit
- [ ] Verified (first attempt)
- [ ] Rank proof
- [ ] Practice pack
- [ ] Percentile
- [ ] XP
- [ ] Streak / day streak
- [ ] Focus ring (cyan)

### Social & competition
- [ ] Arena
- [ ] Division
- [ ] Leaderboard
- [ ] Rival
- [ ] Division war

### Coaching & commerce
- [ ] Guide (role)
- [ ] Session
- [ ] Breakthrough (one-shot)
- [ ] Momentum (subscription)
- [ ] Momentum pack / Quarter Sprint
- [ ] Session credit
- [ ] Booking / pay

### Reports & archives (Momentum)
- [ ] Receipt (generic)
- [ ] Movement Receipt
- [ ] Loop Report
- [ ] Loop SLA
- [ ] Guide Impact Score
- [ ] Guide impact receipt
- [ ] Pre-session brief
- [ ] Study package
- [ ] Progress snapshot
- [ ] Progress archive
- [ ] Grid timeline
- [ ] Trajectory certificate
- [ ] Retest / priority retest

### Profile & share
- [ ] Identity
- [ ] Membership
- [ ] Standing
- [ ] Share
- [ ] Public rank passport

### Guide ranks (new ladder)
- [ ] Practitioner
- [ ] Specialist
- [ ] Expert
- [ ] Master
- [ ] Elite

### Pricing tier marks (replace Lucide Swords/Zap/Trophy)
- [ ] The Arena
- [ ] The Breakthrough
- [ ] Momentum tier

### Landing bento (replace generic icons)
- [ ] Skill Duels
- [ ] Division Leaderboard
- [ ] Quest Practice
- [ ] Rank Card
- [ ] Impact Score
- [ ] Session Room
- [ ] Guide Studio
- [ ] Breakthrough Events
- [ ] Flow steps: Book / Meet / Unpack / Climb

---

## Phase overview

| Phase | Focus                                      | Est. icons |
|-------|--------------------------------------------|------------|
| 0     | Scaffold + vocab map module                | 0          |
| 1     | Guide rank SVG ladder (5)                  | 5          |
| 2     | Core 18 vocabulary SVGs                    | 18         |
| 3     | Student nav + hub stat strip               | wire-up    |
| 4     | Quest + Mastery Grid legend                | wire-up    |
| 5     | Duels + League + Division                  | wire-up    |
| 6     | Sessions + booking + membership            | wire-up    |
| 7     | Landing page + pricing (kill Lucide nouns) | wire-up    |
| 8     | Long tail: chips, tables, FAQ, tutor admin | wire-up    |
| 9     | QA pass + Lucide audit                     | —          |

---

## Phase 0 — Scaffold (do this first)

### Goal
Create the icon registry so every later phase imports from one place.

### Acceptance
- `mentrixa-vocab-map.ts` exports typed keys
- `MentrixaVocabIcon` component: `{ name, size?, className?, gold? }`
- Storybook or `/test/icons` dev page listing all registered icons (optional but recommended)
- ESLint comment or doc: no Lucide for keys in `VocabIconName`

### Prompt 0 (copy into Cursor)

```
Read plan.md Phase 0. Create src/shared/icons/mentrixa-vocab-map.ts with a VocabIconName union covering all checklist terms in plan.md. Create src/shared/icons/mentrixa-vocab-icons.tsx with a MentrixaVocabIcon component that renders from public/icons/vocab/{name}.svg via next/image OR inline SVG slot — placeholder gray boxes for icons not yet designed. Add a dev-only page at src/app/test/icons/page.tsx that grids every VocabIconName with its label. Do not use Lucide for any vocabulary name. Do not modify student rank SVGs in public/icons/wanderer.svg through mentrixer-rank.svg. Run build.
```

---

## Phase 1 — Guide rank SVG ladder

### Goal
Five new Guide rank sticker SVGs + React mirrors + badge integration.

### Acceptance
- SVGs visually match student rank craft (see wanderer.svg) but read as **Guide** identity
- Elite uses gold `#D4A017` ring only on emblem — same rule as Mentrixer
- `GuideRankBadge` shows emblem at sm/md/lg
- Tutor profile + command center show new badges
- Tests pass; build passes

### Prompt 1 (copy into Cursor)

```
Always remember that guide and mentrixer already has a icon respective guide and mentrixer.svg
Read plan.md Phase 1 and src/features/xp/rank-icons.ts + public/icons/wanderer.svg for style reference. Create five hand-authored sticker SVGs at public/icons/guide-ranks/{practitioner,specialist,expert,master,elite}.svg. Create src/features/guide-rank/components/guide-rank-icons.tsx mirroring rank-badge-icons.tsx (48x48, currentColor). Update guide-rank/constants.ts with iconSrc per rank. Update guide-rank-badge.tsx and guide-rank-progress-card.tsx to use emblem icons. Do NOT change student Wanderer→Mentrixer assets. No Lucide for rank badges. Run tests and build.
```

---

## Phase 2 — Core 18 vocabulary SVGs

### Goal
Design the atomic icons everything else composes from.

### The core 18 (design these SVGs first)
1. quest  
2. duel  
3. arena  
4. league  
5. skills  
6. mastery-grid  
7. verified  
8. rank-proof  
9. session  
10. guide-session (mentor + headset)  
11. breakthrough  
12. momentum  
13. receipt  
14. movement-receipt  
15. loop-report  
16. impact-score  
17. streak  
18. xp  

### Acceptance
- Each file in `public/icons/vocab/` passes sticker spec in plan.md
- Registered in `mentrixa-vocab-map.ts`
- Visible on `/test/icons` dev page

### Prompt 2 (copy into Cursor)

```
Read plan.md Phase 2. Hand-author 18 sticker SVG files in public/icons/vocab/ for the core 18 terms listed above. Follow the sticker spec in plan.md (stroke-first, 48x48 viewBox, currentColor-friendly, no Lucide, no AI clip-art). Register each in mentrixa-vocab-map.ts and wire MentrixaVocabIcon to render them. Update /test/icons to show all 18. Do not modify frozen student rank SVGs. Run build.
```

---

## Phase 3 — Student nav + hub stat strip

### Goal
Replace text-only nav and hub stats with icon + label using MentrixaVocabIcon.

### Surfaces
- `src/components/student-navbar.tsx` — Home, Skills, Quest, League, Duels, Momentum membership
- `src/app/(app)/student/page.tsx` — hero CTAs
- `src/app/(app)/student/student-stat-strip-motion.tsx` — XP, accuracy, sessions, rating, streak
- `src/features/student-profile/ui/student-nav-rank-strip.tsx` — keep existing rank SVGs; add rank-proof icon beside count only if not redundant

### Acceptance
- Nav shows custom vocab icon left of each label (desktop) or icon-above (mobile if space tight)
- Stat strip: each stat has vocab icon + number + micro label
- Streak uses `streak.svg`; never spell "day" without flame icon adjacent
- No Lucide for Quest, Duel, League, Skills, XP, Streak

### Prompt 3 (copy into Cursor)

```
Read plan.md Phase 3. Wire MentrixaVocabIcon into student-navbar.tsx (STUDENT_NAV_ITEMS + profile menu Momentum link), student-stat-strip-motion.tsx, and student page hero CTAs. Icon + label pattern; match mentrixStudent dark shell. Keep student rank emblems from rank-icons.ts unchanged. Remove Lucide from these files for product nouns only. Run tests and build.
```

---

## Phase 4 — Quest + Mastery Grid

### Goal
Quest workspace and grid legend become fully visual.

### Surfaces
- `src/app/(app)/student/quest/quest-page-client.tsx`
- `src/features/quest/ui/quest-practice-workspace.tsx`
- `src/features/mastery-grid/mastery-grid.tsx` — legend: Not started, Under 70%, 70%+, Verified
- `src/features/mastery-grid/mastery-grid-explorer.tsx` — skill tree header, unit accordions
- `src/shared/ui/popover-messages-pure.ts` — node detail popovers (icon in header)

### Acceptance
- Grid legend uses 4 custom square glyphs matching cell colors; Verified uses gold seal variant
- Quest eyebrows use quest.svg + verified.svg where copy says "verified"
- Unit rows show unit.svg in accordion trigger
- Rank proofs label pairs with rank-proof.svg everywhere RANK_PROOFS_LABEL appears

### Prompt 4 (copy into Cursor)

```
Read plan.md Phase 4. Add MentrixaVocabIcon to quest page header, quest practice workspace section eyebrows, mastery grid legend and explorer (skill tree, unit accordion, verified counts). Use rank-proof.svg with RANK_PROOFS_LABEL in popovers and profile. Custom SVG only. Run tests and build.
```

---

## Phase 5 — Duels + League + Division

### Surfaces
- `src/app/(app)/student/duel/duel-hub.tsx`, `duel/page.tsx`
- `src/features/duels/ui/skill-duel-results.tsx`
- `src/app/(app)/student/division/division-hub-client.tsx`
- `src/features/divisions/ui/league-forum-panel.tsx` (thread/reply if applicable)
- Leaderboard table headers in `division-tabs.tsx`

### Acceptance
- Duel arena, VS, record, duels XP all have vocab icons
- League/Arena eyebrows use arena.svg + league.svg
- Focus ring retains cyan `#22D3EE` — use focus-ring.svg
- Leaderboard columns: Rank, Streak, XP use icons in header row

### Prompt 5 (copy into Cursor)

```
Read plan.md Phase 5. Wire duel.svg, arena.svg, league.svg, xp.svg, streak.svg, focus-ring.svg into duel hub, duel results, division hub, and leaderboard headers. Replace text-only section eyebrows. Custom sticker SVGs only. Run tests and build.
```

---

## Phase 6 — Sessions, booking, membership

### Surfaces
- `src/app/(app)/student/sessions-list.tsx` — tab icons
- `src/shared/ui/booking-confirmation-card.tsx`
- `src/features/student-profile/ui/momentum-membership-panel.tsx`
- `src/features/student-profile/ui/momentum-membership-hub-card.tsx`
- `src/features/pre-session-brief/brief-card.tsx`
- `src/features/movement-receipt/ui/movement-receipt-hub-card.tsx`
- `src/features/loop-report/ui/loop-report-hub-card.tsx`

### Acceptance
- Booking card pricing block: breakthrough vs momentum compare uses breakthrough.svg + momentum.svg
- Session tabs: Week, Upcoming, Requests, History each have icon
- Brief card: brief.svg in header
- Movement Receipt + Loop Report hub cards: receipt.svg + loop-report.svg
- Momentum perks list: each perk line starts with relevant vocab icon (not generic checkmark Lucide)

### Prompt 6 (copy into Cursor)

```
Read plan.md Phase 6. Add vocab icons to sessions-list tabs, booking-confirmation-card, momentum membership panel/hub card, pre-session brief card, movement receipt and loop report hub cards. Replace Lucide Check/Trophy in membership perk lists with semantic custom SVGs from vocab map. Run tests and build.
```

---

## Phase 7 — Landing page + pricing

### Goal
Marketing surfaces use the same vocabulary SVGs as the app. Kill Lucide for product nouns on landing.

### Surfaces
- `src/shared/ui/pricing.tsx` — replace Swords, Zap, Trophy with arena.svg, breakthrough.svg, momentum.svg
- `src/features/pricing/ui/tier-comparison-table.tsx` — row icon per feature
- `src/features/marketing/landing/v2/sections/features-bento-section.tsx`
- `src/features/marketing/landing/v2/sections/flow-steps-section.tsx`
- `src/features/marketing/marketing-landing-nav.tsx` — keep mentrixer.svg / guide.svg role icons
- Hero rank orbit — use full student rank SVG set (wanderer through mentrixer-rank), not Lucide

### Acceptance
- Pricing tier cards use custom tier SVGs
- Bento tiles use vocab icons matching in-app names
- Flow steps Book/Meet/Unpack/Climb have custom step SVGs in public/icons/vocab/flow-{step}.svg
- Landing "For Guides" path shows Guide rank ladder preview (practitioner→elite)
- Student rank orbit on landing uses existing /icons/*.svg only

### Prompt 7 (copy into Cursor)

```
Read plan.md Phase 7. Replace Lucide Swords/Zap/Trophy in pricing.tsx with custom arena/breakthrough/momentum SVGs. Add vocab icons to features bento and flow steps (create flow-book.svg, flow-meet.svg, flow-unpack.svg, flow-climb.svg if missing). Tier comparison table: one small icon per feature row from vocab map. Landing hero rank orbit: use existing student rank SVGs only (Wanderer→Mentrixer). Add Guide rank strip to For Guides section using guide-ranks/*.svg. No Lucide for product nouns. Run build.
```

---

## Phase 8 — Long tail (chips, tables, tutor, FAQ)

### Surfaces
- `src/shared/ui/chip-messages-pure.ts` + chip renderers — session status
- `src/shared/ui/accordion-messages-pure.ts` — FAQ section headers
- `src/shared/ui/disclosure-messages-pure.ts` — trigger icons
- Tutor: `tutor-command-center-client.tsx`, `payout-dashboard.tsx`, `tutor-studio-client.tsx`
- Admin dashboard stat labels (optional P2)

### Acceptance
- Session status chips: icon + label (Scheduled, Completed, etc.) — create vocab/status-*.svg or reuse session.svg variants
- FAQ accordion titles: quest.svg, duel.svg, session.svg, momentum.svg per section
- Guide Impact Score always uses impact-score.svg with gold when showing verified score number
- Tutor tables: Course, Learner, Status column header icons

### Prompt 8 (copy into Cursor)

```
Read plan.md Phase 8. Add vocab icons to session status chips, FAQ accordion section titles, disclosure triggers, tutor session/payout/studio table headers, and Guide Impact Score badges. Create status-* SVGs in public/icons/vocab/ if needed. Gold impact-score.svg only on verified Impact Score numbers. Run tests and build.
```

---

## Phase 9 — QA + Lucide audit

### Goal
No product noun uses Lucide anywhere in app or landing.

### Acceptance checklist
- [ ] Grep: no `lucide-react` import of Swords, Zap, Trophy, Trophy, Flame for vocabulary (functional chevrons OK)
- [ ] All checklist items in plan.md marked done
- [ ] Student ranks 1–7 unchanged on disk
- [ ] Guide ranks 1–5 render in app + landing
- [ ] Gold only on verified truth elements
- [ ] `/test/icons` shows complete grid
- [ ] npm test + npm run build pass

### Prompt 9 (copy into Cursor)

```
Read plan.md Phase 9. Run ripgrep for lucide-react usage on product vocabulary surfaces listed in plan.md. Replace any remaining Lucide product nouns with MentrixaVocabIcon. Verify student rank SVGs untouched. Verify guide-ranks/*.svg wired. Update plan.md checklist with [x] for completed terms. Run npm test and npm run build. Report any Lucide imports that must stay (chevrons, X, menu) vs violations fixed.
```

---

## Quick reference: student vs Guide ranks

| Track   | Ranks |
|---------|-------|
| **Mentrixer (student)** | 1 Wanderer → 2 Seeker → 3 Scholar → 4 Contender → 5 Rival → 6 Apex → 7 Mentrixer |
| **Guide (tutor)**       | 1 Practitioner → 2 Specialist → 3 Expert → 4 Master → 5 Elite |

Never mix ladders on the wrong profile. Students show account rank emblems. Guides show Guide rank emblems. Impact Score is separate from both (gold meter).

---

## After rollout

When all phases complete, delete or gate `/test/icons` behind dev if desired. Document final icon map in `src/shared/icons/README.md` (optional, one page: name → file → usage).

**Verdict:** This plan keeps your seven student rank stickers sacred, adds five new Guide rank stickers, and forces every other product word through custom SVG vocabulary before it ships in UI.

**Next action:** Run **Prompt 0** in Agent mode to scaffold the registry, then **Prompt 1** for Guide ranks.
