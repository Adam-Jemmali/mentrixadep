"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  buildWrappedSlideCopy,
  type WrappedReportData,
  type WrappedSlideIndex,
  WRAPPED_SLIDE_COUNT,
} from "@/features/wrapped/wrapped-pure";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { Button } from "@/shared/ui/button";

function asVocab(name: string): VocabIconName {
  return name as VocabIconName;
}

export function WrappedShareCarousel({
  reportYear,
  data,
  shareUrl,
  slideUrls,
  rankUsername,
  initialSlide = 1,
}: {
  reportYear: number;
  data: WrappedReportData;
  shareUrl: string;
  slideUrls: string[];
  rankUsername: string | null;
  initialSlide?: number;
}) {
  const slides = buildWrappedSlideCopy({ reportYear, data, rankUsername });
  const start = Math.min(
    WRAPPED_SLIDE_COUNT,
    Math.max(1, Number.isFinite(initialSlide) ? Math.round(initialSlide) : 1),
  );
  const [index, setIndex] = useState(start - 1);
  const [copied, setCopied] = useState(false);
  const current = slides[index] ?? slides[0]!;
  const imageUrl = slideUrls[index] ?? slideUrls[0] ?? null;

  const go = useCallback((next: number) => {
    setIndex(((next % WRAPPED_SLIDE_COUNT) + WRAPPED_SLIDE_COUNT) % WRAPPED_SLIDE_COUNT);
  }, []);

  const copySlideLink = useCallback(async () => {
    const slide = (index + 1) as WrappedSlideIndex;
    const url = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}slide=${slide}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [index, shareUrl]);

  const tweetText = `${current.title}. Mentrixa Wrapped ${reportYear}. ${shareUrl}`;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--mx-gold)]">
          <MentrixaVocabIcon name="passport" size={22} surface="dark" title="Mentrixa" />
          Mentrixa
        </span>
        <Link href="/" className="text-sm font-medium text-violet-300 hover:text-white">
          Home
        </Link>
      </div>

      <div className="space-y-4 md:space-y-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--mx-navy-2)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={current.title}
              width={1200}
              height={630}
              unoptimized
              priority
              className="h-auto w-full"
            />
          ) : null}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-violet-400/25 bg-[var(--mx-navy)] px-4 py-4">
          <MentrixaVocabIcon
            name={asVocab(current.eyebrowIcon)}
            size={28}
            surface="dark"
            title={current.eyebrow}
          />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--mx-gold)]">
              {current.eyebrow}
            </p>
            <p className="mt-1 text-lg font-bold text-white">{current.title}</p>
            <p className="mt-1 text-sm text-[#C7D2FE]">{current.body}</p>
            {current.footer ? (
              <p className="mt-2 font-mono text-xs text-slate-400">{current.footer}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Prev
          </button>
          <div className="flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.slide}
                type="button"
                aria-label={`Slide ${slide.slide}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full ${
                  i === index ? "bg-[var(--mx-violet)]" : "bg-white/25"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Next
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => void copySlideLink()}
            className="rounded-xl bg-[var(--mx-violet)] text-white hover:bg-[var(--mx-primary-hover)]"
          >
            {copied ? "Copied" : "Share this slide"}
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="rounded-xl border-violet-400/40 bg-transparent text-violet-100"
          >
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on X
            </a>
          </Button>
        </div>
      </div>

      {/* Mobile-friendly vertical stack of all slides */}
      <div className="mt-10 space-y-4 md:hidden">
        {slides.map((slide, i) => {
          const url = slideUrls[i];
          if (!url) return null;
          return (
            <div key={slide.slide} className="overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={url}
                alt={slide.title}
                width={1200}
                height={630}
                unoptimized
                className="h-auto w-full"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl border border-[var(--mx-gold)]/35 bg-[var(--mx-navy)] px-5 py-6 text-center">
        <p className="inline-flex items-center justify-center gap-2 text-base font-semibold text-white">
          <MentrixaVocabIcon name="quest" size={24} surface="dark" title="Wrapped" />
          What would your Wrapped say?
        </p>
        <Link
          href="/auth/signin"
          className="mt-4 inline-flex rounded-xl bg-[var(--mx-violet)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--mx-primary-hover)]"
        >
          Start on Mentrixa
        </Link>
      </div>
    </div>
  );
}
