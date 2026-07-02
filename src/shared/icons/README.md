# Mentrixa vocabulary icons

Single registry: `mentrixa-vocab-map.ts`. Render with `MentrixaVocabIcon` from `mentrixa-vocab-icons.tsx`.

## Rules

- Product nouns use custom sticker SVGs in `public/icons/vocab/` or `public/icons/guide-ranks/`.
- Student account ranks (Wanderer → Mentrixer) stay in `public/icons/*.svg` via `rank-icons.ts` — not in this registry.
- Gold `#D4A017` only on `allowsGold` keys when `gold` prop is set (verified, rank-proof, impact-score, percentile, passport, trajectory-certificate, guide-impact-receipt, elite).

## Asset paths

| Kind | Path pattern | Example |
|------|----------------|---------|
| Vocabulary | `/icons/vocab/{name}.svg` | `quest` → `public/icons/vocab/quest.svg` |
| Guide rank | `/icons/guide-ranks/{key}.svg` | `master` → `public/icons/guide-ranks/master.svg` |

## Common usage

| Name | Label | Typical surfaces |
|------|-------|------------------|
| `home` | Home | Student navbar |
| `skills` | Skills | Nav, mastery, course columns |
| `quest` | Quest | Nav, quest workspace, FAQ |
| `league` | League | Nav, division hub |
| `duels` | Duels | Nav, duel hub |
| `streak` | Streak | Stat strip, leaderboard, `StreakCountDisplay` |
| `day-mon` … `day-sun` | Weekday | Streak weekday badge (via `weekdayVocabIcon`) |
| `xp` | XP | Stat strip, duel results — asset is `/images/xp.webp` |
| `verified` | Verified | Mastery grid legend (gold on verified cells) |
| `rank-proof` | Rank proof | Profile, popovers (gold when verified) |
| `impact-score` | Guide Impact Score | Tutor profile, command center (gold on score) |
| `breakthrough` | Breakthrough | Booking, breakthrough events |
| `momentum` | Momentum | Membership, pricing tier |
| `practitioner` … `elite` | Guide ranks | Tutor profile, landing For Guides |

## Dev gallery

`/test/icons` lists all `VocabIconName` keys (development only; 404 in production).

## Adding a term

1. Add SVG to `public/icons/vocab/` (48×48, stroke-first, mask-friendly).
2. Register in `mentrixa-vocab-map.ts` (`VocabIconName` + `VOCAB_ICON_REGISTRY`).
3. Use `<MentrixaVocabIcon name="…" />` — never Lucide for the product noun.
4. Run `npm test` and `npm run build`.
