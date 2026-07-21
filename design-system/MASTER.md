# Mentrixa Design System — MASTER

Global source of truth for UI rebuild sessions. Overrides generic ui-pro-max output where brand rules conflict.

## Identity

Every screen answers: **what is true about me right now that was not true yesterday, compared to someone real.**

## Brand (from tokens.css — never hardcode hex)

| Role | Token | Value |
|------|-------|-------|
| Primary | `--mx-violet` / `--mx-primary` | `#7C3AED` |
| Accent | `--mx-indigo` | `#6366F1` |
| Shell | `--mx-navy`, `--mx-navy-2` | `#0B1220`, `#0F172A` |
| Verified truth | `--mx-gold` | `#D4A017` (never decorative) |
| Hero only | `--mx-cyan` | `#22D3EE` |
| Body | `--mx-steel` | `#4B5563` |
| Muted | `--mx-muted` | `#9CA3AF` |

## Typography

| Use | Font |
|-----|------|
| UI default | Geist + Geist Mono (`next/font`) |
| Rank reveal only | Playfair Display |

Do not substitute Fira or other ui-pro-max suggestions when they conflict with brand.

## Style

Dark navy OLED shells. Glass surfaces via KokonutGlass. Verified gold glow only on proof elements. No emoji. No hyphens as bullets.

## Animation stack (import barrels only)

| Job | Library | Import from |
|-----|---------|-------------|
| Timelines, ScrollTrigger, landing | GSAP | `@/shared/core/gsap` |
| Smooth scroll | Lenis | `@/shared/animation/lenis-provider` (root only) |
| Data viz, node bloom, grid stagger | Anime.js | `@/shared/animation/anime` |
| Hover, tap, micro-interactions | Motion.dev | `@/shared/animation/motion` |
| Exit, layout, modals | Framer Motion API via Motion | `@/shared/animation/motion` |
| Loading shimmer | Bklit | `@/shared/ui/bklit-shimmer` |
| Frosted panels, verified glow | Kokonut | `@/shared/ui/kokonut-glass` |
| Structure | shadcn / HeroUI / 21st MCP | `@/shared/ui/*` |

Banned in feature/components code: direct `animejs`, `motion/react`, `framer-motion`, react-spring, lottie, aos.

## UX non-negotiables

1. One primary action above the fold per page
2. Bklit shimmer for every loading state (no spinners)
3. Animate data changes (never jump)
4. Empty states include a next-action button
5. Error states: one sentence + next step
6. Max 3 actions per card
7. `prefers-reduced-motion` → instant state

## Shells

`.mx-shell-workbench` (quest/studio), `.mx-shell-arena` (duels/division)

## Skill workflow (every UI session)

1. Read `.cursor/rules/mentrixa-master-context.mdc` + `mentrixa-animation-master-context.mdc` + `mentrixa-ui-stack.mdc`
2. Run ui-pro-max for gap analysis: `python .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p Mentrixa`
3. Apply this MASTER when brand conflicts with search output
4. Structural components: 21st MCP / shadcn when net-new
5. Run `npm run validate:tokens` + `npm run validate:ui-imports`
