"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { buildRankCardShareTweet } from "@/features/rank-card/calculate-pure";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";

type Props = {
  username: string;
  siteUrl: string;
  topSubject: string | null;
  rankTitle: string;
  accuracy: number;
  className?: string;
};

export function RankCardShareButton({
  username,
  siteUrl,
  topSubject,
  rankTitle,
  accuracy,
  className,
}: Props) {
  const [copied, setCopied] = useState(false);
  const cardUrl = `${siteUrl.replace(/\/$/, "")}/rank/${username}`;

  const tweetText = buildRankCardShareTweet({
    subject: topSubject ?? "arena",
    rankTitle,
    accuracy,
    username,
    siteUrl: siteUrl.replace(/\/$/, ""),
  });

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardUrl)}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [cardUrl]);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[2.5rem] border border-indigo-100 bg-white p-6 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.08)] sm:p-8",
        className,
      )}
    >
      <div className="mb-6 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.25em] text-indigo-950">
          Share your Rank Card
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-slate-600">
          Public proof of competitive performance — verified quest, duel, and Guide session data.
          Live at{" "}
          <span className="font-mono font-semibold text-indigo-700">
            mentrixa.one/rank/{username}
          </span>
        </p>
      </div>

      <div className="mb-6 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
          Share preview
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-indigo-950">
          {topSubject ?? "Arena"} · {rankTitle} · {accuracy}% accuracy
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => void copyLink()}
          className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
        >
          {copied ? "Link copied" : "Copy link"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          asChild
          className="rounded-xl border-indigo-200 text-indigo-900 hover:bg-indigo-50"
        >
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
            Share on X
          </a>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          asChild
          className="rounded-xl border-indigo-200 text-indigo-900 hover:bg-indigo-50"
        >
          <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-indigo-50 pt-5">
        <Image
          src="/icons/mentrixer.svg"
          alt=""
          width={32}
          height={32}
          unoptimized
          className="h-8 w-8 opacity-60"
        />
        <p className="text-[11px] leading-relaxed text-slate-500">
          Employers and peers see live rank data — not self-reported course completion.
        </p>
      </div>
    </section>
  );
}
