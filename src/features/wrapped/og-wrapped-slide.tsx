import type { ReactElement } from "react";
import type { WrappedSlideCopy } from "@/features/wrapped/wrapped-pure";

export const WRAPPED_OG_COLORS = {
  navyDeep: "#070d1a",
  navy: "var(--mx-navy)",
  navySoft: "var(--mx-navy-2)",
  violet: "var(--mx-violet)",
  indigo: "var(--mx-indigo)",
  gold: "var(--mx-violet)",
  white: "#F8FAFC",
  muted: "#94A3B8",
  faint: "#64748B",
} as const;

export function renderWrappedOgSlide(params: {
  copy: WrappedSlideCopy;
  iconSrc: string | null;
  wordmarkGold?: boolean;
}): ReactElement {
  const { copy, iconSrc } = params;
  const goldWordmark = params.wordmarkGold ?? (copy.slide === 1 || copy.slide === 5);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 56,
        background: `linear-gradient(145deg, ${WRAPPED_OG_COLORS.navyDeep} 0%, ${WRAPPED_OG_COLORS.navy} 48%, ${WRAPPED_OG_COLORS.navySoft} 100%)`,
        color: WRAPPED_OG_COLORS.white,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires img */}
        {iconSrc ? <img src={iconSrc} width={44} height={44} alt="" /> : null}
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: goldWordmark ? WRAPPED_OG_COLORS.gold : WRAPPED_OG_COLORS.indigo,
          }}
        >
          {copy.eyebrow}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
        <div
          style={{
            fontSize: copy.slide === 1 ? 64 : 48,
            fontWeight: 900,
            lineHeight: 1.08,
            color: goldWordmark && copy.slide === 1 ? WRAPPED_OG_COLORS.gold : WRAPPED_OG_COLORS.white,
          }}
        >
          {copy.title}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.35, color: "#C7D2FE" }}>
          {copy.body}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: WRAPPED_OG_COLORS.gold,
          }}
        >
          MENTRIXA
        </div>
        <div style={{ fontSize: 18, color: WRAPPED_OG_COLORS.faint, fontFamily: "monospace" }}>
          {copy.footer ?? `Slide ${copy.slide} of 5`}
        </div>
      </div>
    </div>
  );
}
