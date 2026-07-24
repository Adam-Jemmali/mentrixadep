# P028 verification checklist

Manual and automated gates for the UI/animation layer. Run after any change to Lenis, GSAP, Anime, Framer, tokens, gold, or loading shimmer.

## Automated gates

| Command | Expect |
| --- | --- |
| `npm run validate:tokens:strict` | Exit 0 |
| `npm run test:ci` | All unit tests pass |
| `npm run test:e2e:ci` | Includes `e2e/arena.spec.ts` (aria-live) and `e2e/quest.spec.ts` (guest keyboard) |
| `npm run lighthouse:landing` | Performance ≥ 85, Accessibility ≥ 92, Best Practices ≥ 90, CLS ≤ 0.1 |
| `npm run lighthouse:student` | Same thresholds on `/student` (auth may redirect; run signed-in if needed) |

`release:verify` now includes `validate:tokens:strict`.

## Manual browser pass

Run on **mentrixa.one** (or local `npm run dev` with production build for perf).

### Scroll and motion

| Check | Method | Pass criteria |
| --- | --- | --- |
| Lenis scroll | Scroll landing + student home | Smooth inertia, no jank |
| GSAP section reveal | Scroll past hero on landing | Sections enter with y:40 easeOut |
| Anime node bloom | Complete quest → proficient node on done screen | Node bloom animation fires |
| Framer quest cards | Answer a question | ~0.3s slide between cards |
| Reduced motion | OS “Reduce motion” on | Animations instant; product fully usable |

### Accessibility

| Check | Method | Pass criteria |
| --- | --- | --- |
| Arena aria-live | VoiceOver/NVDA on `/arena` for 10s | New feed events announced politely |
| Quest keyboard | Tab through MCQ on `/try` or signed-in quest | Arrow keys move focus; Continue receives focus after answer |

### Loading (Slow 3G)

DevTools → Network → Slow 3G. Navigate student home, landing, `/try`, `/arena`.

| Check | Pass criteria |
| --- | --- |
| Route `loading.tsx` | BklitShimmer blocks visible; no blank white sections |
| Deferred sections | Section fallbacks show shimmer placeholders |
| Inline actions | Submit buttons may still show spinners |

**Targets (manual throttle):** student home FCP &lt; 1.8s, landing LCP &lt; 2.5s.

### Shared session

Paired student + Guide session: answer correctly on shared grid → remote node bloom syncs.

## Gold and tokens

- Gold (`var(--mx-gold)`) only on verified truth: MasteryNode verified, AP band 4–5 verified, VFA streak, Guide Impact &gt; 80, certification, top rank badge.
- No decorative gold on duels, arena widgets, wrapped teasers, or momentum projections.
- Impact proficient chips use `green-*` (matches mastery node proficient `#15803d`).

## Local verification log (2026-07-24)

| Check | Result |
| --- | --- |
| `npm run test:ci` | 981/981 pass |
| `npm run validate:tokens:strict` | Pass |
| `e2e/arena.spec.ts` + `e2e/quest.spec.ts` | 6/6 pass (local dev) |
| Arena `aria-live="polite"` | Confirmed on `http://127.0.0.1:3000/arena` |
| BklitShimmer route shells | All `loading.tsx` routes use shimmer skeletons |

Production Lighthouse and VoiceOver/Slow 3G rows require post-deploy sign-off on mentrixa.one.

## Verdict

Layer is done when strict token gate passes, accessibility blockers ship, BklitShimmer covers section loads, and Lighthouse + manual evidence confirms the table above.

**Next action:** Run `npm run lighthouse:landing` against production after deploy, then complete the Slow 3G + VoiceOver rows in this doc and sign off.
