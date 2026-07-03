"use client";

import { useCallback, useState } from "react";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { normalizeRankTitle } from "@/features/xp/rank-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

type Props = {
  username: string;
  siteUrl: string;
  passportVerdict: string;
  rankTitle: string;
  rankLevel: number;
  className?: string;
};

export function RankCardShareButton({
  username,
  siteUrl,
  passportVerdict,
  rankTitle,
  rankLevel,
  className,
}: Props) {
  const [copied, setCopied] = useState(false);
  const cardUrl = `${siteUrl.replace(/\/$/, "")}/rank/${username}`;
  const displayRankTitle = normalizeRankTitle(rankTitle);

  const tweetText = `Verified AP Calculus AB rank: ${passportVerdict} · ${displayRankTitle} · ${cardUrl}`;

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
      className={cn(mentrixStudent.hubSticky, "rotate-0 p-5 sm:p-8", className)}
      aria-label="Share verified passport"
    >
      <div className="mb-6 space-y-3">
        <h2 className="inline-flex items-center gap-2.5">
          <MentrixaVocabIcon name="passport" size={22} surface="light" title="Verified passport" />
          <span className={cn(mentrixHubSurfaces.inkTitle, "text-lg sm:text-xl")}>
            Share your verified passport
          </span>
        </h2>
        <p className={cn(mentrixHubSurfaces.inkBody, "max-w-md text-sm leading-relaxed")}>
          Public proof from first attempts only. Live at{" "}
          <span className="font-mono font-semibold text-[#4F46E5]">
            mentrixa.one/rank/{username}
          </span>
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-[#C4B5FD] bg-white/75 p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6366F1]">
          Share preview
        </p>
        <p className={cn(mentrixHubSurfaces.inkBody, "mt-2 text-sm font-medium leading-relaxed")}>
          {passportVerdict}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <RankBadge
            rank={{ level: rankLevel, title: rankTitle }}
            size="sm"
            showLabel={false}
            labelTone="light"
          />
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4F46E5]">
            {displayRankTitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => void copyLink()}
          className={mentrixHubSurfaces.btnSolid}
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={mentrixHubSurfaces.ghostLink}
        >
          Share on X
        </a>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={mentrixHubSurfaces.ghostLink}
        >
          LinkedIn
        </a>
      </div>

      <div className="mt-6 flex items-start gap-3 border-t border-[#C4B5FD]/70 pt-5">
        <MentrixaVocabIcon name="passport" size={28} surface="light" className="shrink-0 opacity-80" />
        <p className={cn(mentrixHubSurfaces.inkMuted, "text-xs leading-relaxed")}>
          Anyone with the link sees your verified mastery map and percentile.
        </p>
      </div>
    </section>
  );
}
