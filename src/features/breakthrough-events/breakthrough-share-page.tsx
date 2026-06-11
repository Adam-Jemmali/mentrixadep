"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { buildBreakthroughShareTweet } from "@/features/breakthrough-events/detect-pure";
import { markBreakthroughShared } from "@/features/breakthrough-events/reads";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { getSiteUrl } from "@/shared/core/site";
import { Button } from "@/shared/ui/button";

const MENTRIXER_GOLD = "#D4A017";

export type BreakthroughShareData = {
  eventId: string;
  subject: string;
  concept: string;
  accuracyBefore: number;
  accuracyAfter: number;
  detectedAt: string;
  shareUrl: string;
  ogImageUrl: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(iso));
}

export function BreakthroughSharePage({ data }: { data: BreakthroughShareData }) {
  const [copied, setCopied] = useState(false);
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const tweetText = buildBreakthroughShareTweet({
    concept: data.concept,
    before: data.accuracyBefore,
    after: data.accuracyAfter,
    shareUrl: data.shareUrl,
  });

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      void markBreakthroughShared(data.eventId);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [data.eventId, data.shareUrl]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-12">
      <div className="mx-auto mb-8 flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
        <span className="text-sm font-semibold tracking-wide text-slate-100">Mentrixa Breakthrough</span>
        <Link href="/" className="text-sm font-medium text-indigo-200 hover:text-white">
          Back to homepage
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_45%,#111827_100%)] p-8 text-center shadow-2xl sm:p-10">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{ borderColor: `${MENTRIXER_GOLD}66`, backgroundColor: `${MENTRIXER_GOLD}18` }}
        >
          <Trophy className="h-7 w-7" style={{ color: MENTRIXER_GOLD }} aria-hidden />
        </div>

        <p
          className="text-[11px] font-black uppercase tracking-[0.35em]"
          style={{ color: MENTRIXER_GOLD }}
        >
          Breakthrough
        </p>
        <h1 className="mt-3 text-3xl font-black italic text-white sm:text-4xl">{data.concept}</h1>
        <p className="mt-4 text-2xl font-bold tabular-nums text-indigo-100">
          {Math.round(data.accuracyBefore)}% → {Math.round(data.accuracyAfter)}%
        </p>
        <p className="mt-2 text-sm font-medium text-violet-200">{data.subject}</p>
        <p className="mt-1 text-xs text-slate-400">{formatDate(data.detectedAt)}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {copied ? "Link copied" : "Copy link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="rounded-xl border-indigo-400/40 bg-transparent text-indigo-100 hover:bg-white/5"
          >
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on X
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="rounded-xl border-indigo-400/40 bg-transparent text-indigo-100 hover:bg-white/5"
          >
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-slate-300">
        <Image src={MENTRIXA_LOGO_PNG} alt="" width={24} height={24} className="opacity-90" />
        <span className="font-mono text-sm text-slate-200">{siteHost}</span>
      </div>

      <p className="mt-6 text-center text-sm text-indigo-200/80">
        Verified competitive performance — accuracy measured under real quest pressure.
      </p>
    </div>
  );
}
