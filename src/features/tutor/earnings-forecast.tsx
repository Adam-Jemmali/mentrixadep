"use client";

import { useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { useReducedMotion } from "@/shared/animation/motion";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_RECEIPT_ICON } from "@/shared/icons/vocab-canonical";
import type { GuideEarningsForecastView } from "@/features/tutor/earnings-forecast-pure";
import { cn } from "@/shared/core/utils";

export function GuideEarningsForecastPanel({
  forecast,
  className,
}: {
  forecast: GuideEarningsForecastView | null;
  className?: string;
}) {
  if (!forecast) {
    return (
      <p className="text-sm text-[#94A3B8]">
        Forecast builds after your first impact node and open slots are set.
      </p>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border-[var(--mx-surface-3)] bg-[var(--mx-navy-2)] shadow-[0_12px_40px_-12px_rgba(11,18,32,0.55)]",
        className,
      )}
      style={{ borderLeft: "3px solid var(--mx-gold)" }}
    >
      <CardContent className="space-y-4 p-4">
        <h3 className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--mx-gold)]">
          <MentrixaVocabIcon
            name={CANONICAL_RECEIPT_ICON}
            size={16}
            gold
            surface="dark"
            title="Earnings forecast"
          />
          Earnings forecast
        </h3>

        <div className="space-y-1">
          <p className="text-sm leading-snug text-white/88">{forecast.demandPrimary}</p>
          {forecast.demandSecondary ? (
            <p className="text-sm leading-snug text-white/65">{forecast.demandSecondary}</p>
          ) : null}
        </div>

        {forecast.projectedDollars != null ? (
          <ProjectedMonthlyAmount
            dollars={forecast.projectedDollars}
            paceLabel={forecast.paceLabel}
          />
        ) : null}

        <footer className="pt-1">
          {forecast.showCta ? (
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-0 text-sm font-semibold text-[var(--mx-violet)] hover:bg-[var(--mx-violet)]/10 hover:text-[#C4B5FD]"
              onClick={() => {
                document.getElementById("tutor-availability-slots")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              {forecast.ctaLabel}
            </Button>
          ) : (
            <p className="text-xs font-medium text-[#94A3B8]">{forecast.ctaLabel}</p>
          )}
        </footer>
      </CardContent>
    </Card>
  );
}

function ProjectedMonthlyAmount({
  dollars,
  paceLabel,
}: {
  dollars: number;
  paceLabel: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const dollarRef = useRef<HTMLSpanElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!paceLabel) return;

    if (reduceMotion) {
      if (amountRef.current) amountRef.current.textContent = String(dollars);
      if (dollarRef.current) dollarRef.current.style.opacity = "1";
      return;
    }

    if (dollarRef.current) {
      dollarRef.current.style.opacity = "0";
      void animate(dollarRef.current, {
        opacity: [0, 1],
        duration: 300,
        ease: "outQuad",
      });
    }

    if (!amountRef.current) return;

    const counter = { value: 0 };
    const countTimer = window.setTimeout(() => {
      void animate(counter, {
        value: dollars,
        duration: 1200,
        ease: "outExpo",
        onUpdate: () => {
          if (amountRef.current) {
            amountRef.current.textContent = String(Math.round(counter.value));
          }
        },
      });
    }, 600);

    return () => window.clearTimeout(countTimer);
  }, [dollars, paceLabel, reduceMotion]);

  if (!paceLabel) return null;

  return (
    <p className="font-[family-name:var(--font-playfair),serif] text-2xl font-bold leading-snug text-[var(--mx-gold)]">
      At your current pace: ~
      <span ref={dollarRef} style={{ opacity: reduceMotion ? 1 : 0 }}>
        $
      </span>
      <span ref={amountRef} className="tabular-nums">
        {reduceMotion ? dollars : 0}
      </span>
      {" this month"}
    </p>
  );
}
