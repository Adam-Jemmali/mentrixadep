import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { HeroSentenceAnimate } from "@/features/marketing/landing/e/hero-sentence-animate";

const HERO_WORDS = LANDING_E.heroSentence.split(/\s+/);

/** SSR hero headline — client hydrates Anime.js word reveal. */
export function LandingHeroSentence() {
  return (
    <HeroSentenceAnimate
      ariaLabel={LANDING_E.heroAriaLabel}
      className="max-w-[640px] text-left font-[family-name:var(--font-playfair),serif] text-[clamp(32px,5vw,54px)] font-bold leading-[1.12] text-white"
    >
      {HERO_WORDS.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="hero-word mr-[0.28em] inline-block opacity-0 will-change-transform"
        >
          {word}
        </span>
      ))}
    </HeroSentenceAnimate>
  );
}
