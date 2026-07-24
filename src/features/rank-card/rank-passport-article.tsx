import Link from "next/link";
import Image from "next/image";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { RANK_HERO_SIZE } from "@/features/xp/rank-display-tokens";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { getSiteUrl } from "@/shared/core/site";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import type { PassportVerdict, RankCardData } from "@/features/rank-card/types";
import { summarizeMasteryGrid } from "@/features/mastery-grid/mastery-grid-pure";
import { RankBreakdownPopover } from "@/shared/ui/popover-patterns";
import { passportVerdictPlainText } from "@/features/rank-card/rank-passport-pure";
import { explainFirstAttemptAccuracy, explainPeerStanding, formatPeerStandingShort, peerBeatCount } from "@/features/xp/rank-statistics-pure";
import { AP_CALC_AB_SUBJECT, AP_CALC_AB_SUBJECT_DISPLAY } from "@/features/quest/ap-calc-ab-subject";
import { rankProofsCountLabel } from "@/features/xp/rank-proofs-labels";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";
import { VerdictPanel } from "@/features/guidance/verdict-panel";

import { VERIFIED_GOLD_CSS } from "@/components/ui/mentrixa-ui-tokens";

const VERIFIED_GOLD = VERIFIED_GOLD_CSS;

function PassportVerdictHeadline({ verdict }: { verdict: PassportVerdict }) {
  if (verdict.kind === "ranked") {
    return (
      <p className={cn(mentrixHubSurfaces.inkTitle, "text-xl leading-snug sm:text-2xl lg:text-3xl")}>
        Top{" "}
        <span className="font-black" style={{ color: VERIFIED_GOLD }}>
          {verdict.topPercent}
        </span>{" "}
        percent of everyone verified on {AP_CALC_AB_SUBJECT}, first answers only, no retakes
      </p>
    );
  }

  return (
    <p className={cn(mentrixHubSurfaces.inkTitle, "text-lg leading-relaxed sm:text-xl")}>
      {passportVerdictPlainText(verdict)}
    </p>
  );
}

export function RankPassportTopBar() {
  return (
    <div
      className={cn(
        mentrixStudent.hubSticky,
        "mb-6 flex rotate-0 items-center justify-between px-4 py-3 sm:px-5",
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mx-indigo)]">
        Verified passport
      </span>
      <Link href="/" className={mentrixHubSurfaces.ghostLink}>
        Mentrixa
      </Link>
    </div>
  );
}

function BreakthroughChip({
  nodeName,
  beforeState,
  afterState,
}: {
  nodeName: string;
  beforeState: string;
  afterState: string;
}) {
  return (
    <div className="rounded-md border border-violet-300 bg-white/80 px-3 py-2 text-center shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
        {nodeName}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-[#16A34A]">
        {beforeState} → {afterState}
      </p>
    </div>
  );
}

export function RankPassportArticle({
  data,
  previewMode = false,
  totalSkillNodes,
  isOwner = false,
  className,
}: {
  data: RankCardData;
  previewMode?: boolean;
  /** When mastery grid is absent — e.g. guest try preview. */
  totalSkillNodes?: number;
  /** When true, rank_delta nextAction is shown to the passport owner only. */
  isOwner?: boolean;
  className?: string;
}) {
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const rankVisual = getAccountRankByLevel(data.rankLevel);
  const isTopTier = rankVisual.key === "mentrixer";
  const gridSummary = data.masteryGrid ? summarizeMasteryGrid(data.masteryGrid) : null;
  const totalNodes = gridSummary?.totalNodes ?? totalSkillNodes ?? 0;
  const verifiedCount = data.verifiedSkillCount;
  const accuracyPercent = data.verifiedAccuracyPercent;
  const nodesBarPercent =
    totalNodes > 0 ? Math.min(100, Math.round((verifiedCount / totalNodes) * 100)) : 0;
  const nodesBarWidth =
    totalNodes > 0 ? Math.max(0, Math.min(100, (verifiedCount / totalNodes) * 100)) : 0;

  return (
    <article
      className={cn(mentrixStudent.hubSticky, "rotate-0 overflow-hidden p-0", className)}
      aria-label={previewMode ? "Rank passport preview" : "Verified rank passport"}
    >
      <header className="border-b border-violet-300 bg-[#EEF2FF]/90 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src={MENTRIXA_LOGO_PNG} alt="" width={28} height={28} className="opacity-90" />
            <div>
              <p className="text-lg font-bold tracking-[0.18em] text-[var(--mx-navy)]">MENTRIXA</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--mx-indigo)]">
                Verified skill passport
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              {AP_CALC_AB_SUBJECT_DISPLAY}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Issued {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </header>

      <div className="grid sm:grid-cols-[minmax(0,11.5rem)_1fr]">
        <aside className="border-b border-violet-200 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="mx-auto flex max-w-[148px] flex-col items-center rounded-lg border border-violet-300 bg-white/70 p-4 text-center">
            <RankBadge
              rank={{ level: data.rankLevel, title: data.rankTitle }}
              size={RANK_HERO_SIZE}
              active
              surface="light"
              showLabel
              labelTone="light"
              animate={rankVisual.key === "mentrixer" || rankVisual.key === "apex"}
            />
            <p
              className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: isTopTier ? VERIFIED_GOLD : rankVisual.labelOnLight }}
            >
              {normalizeRankTitle(data.rankTitle)}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
              Rank tier
            </p>
            <div className="my-3 h-px w-full bg-[#E0E7FF]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
              Holder
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--mx-navy)]">{data.displayName}</p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mx-indigo)]">
              @{data.username}
            </p>
          </div>
        </aside>

        <div className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              First-attempt accuracy
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p
                className="font-serif text-4xl font-bold tabular-nums"
                style={{ color: verifiedCount > 0 ? VERIFIED_GOLD : "var(--mx-navy)" }}
              >
                {accuracyPercent}%
              </p>
              {verifiedCount > 0 ? (
                <span className="text-sm font-semibold text-[var(--mx-violet)]">verified</span>
              ) : null}
            </div>
            {verifiedCount > 0 ? (
              <p className={cn(mentrixHubSurfaces.inkMuted, "mt-1 text-sm leading-relaxed")}>
                {explainFirstAttemptAccuracy(verifiedCount, accuracyPercent)}
              </p>
            ) : null}
            {data.passportVerdict.kind === "ranked" ? (
              <p className={cn(mentrixHubSurfaces.inkMuted, "mt-1 text-sm leading-relaxed")}>
                {data.verifiedPercentile != null
                  ? explainPeerStanding(data.verifiedPercentile)
                  : `Top ${data.passportVerdict.topPercent}% of all Mentrixers tested`}
              </p>
            ) : null}
          </div>

          <div className="h-px bg-[#E0E7FF]" />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Nodes verified
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E0E7FF]">
              <div
                className="relative h-full rounded-full bg-[var(--mx-violet)]/80"
                style={{ width: `${nodesBarWidth}%` }}
              >
                {verifiedCount > 0 && nodesBarWidth > 4 ? (
                  <span
                    className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full"
                    style={{ backgroundColor: VERIFIED_GOLD }}
                    aria-hidden
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className={mentrixHubSurfaces.inkBody}>
                {verifiedCount} of {totalNodes || "—"} {AP_CALC_AB_SUBJECT} skill nodes
              </p>
              {totalNodes > 0 ? (
                <p className="font-semibold tabular-nums" style={{ color: VERIFIED_GOLD }}>
                  {nodesBarPercent}%
                </p>
              ) : null}
            </div>
          </div>

          <div className="h-px bg-[#E0E7FF]" />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Peer standing
            </p>
            <div className="mt-2">
              <PassportVerdictHeadline verdict={data.passportVerdict} />
            </div>
            {data.verifiedSkillCount > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="inline-flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-[#475569]">
                  <span className="inline-flex items-center gap-1">
                    <MentrixaVocabIcon name="rank-proof" size={14} gold />
                    {rankProofsCountLabel(data.verifiedSkillCount)}
                  </span>
                  {data.verifiedPercentile != null
                    ? `. Beat ${peerBeatCount(data.verifiedPercentile)}/100 Mentrixers (${formatPeerStandingShort(data.verifiedPercentile)})`
                    : ""}
                </p>
                <RankBreakdownPopover
                  stats={{
                    verifiedCount: data.verifiedSkillCount,
                    accuracyPercent,
                    percentile: data.verifiedPercentile,
                    eligibleCohortSize: null,
                  }}
                  tone="light"
                  triggerLabel="Breakdown"
                />
              </div>
            ) : null}
          </div>

          {data.rankDeltaVerdict ? (
            <>
              <div className="h-px bg-[#E0E7FF]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
                  What changed
                </p>
                <VerdictPanel
                  verdict={data.rankDeltaVerdict}
                  tone="light"
                  showNextAction={isOwner}
                  className="mt-3"
                />
              </div>
            </>
          ) : null}

          {data.breakthroughReceipts.length > 0 ? (
            <>
              <div className="h-px bg-[#E0E7FF]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
                  Breakthrough record
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {data.breakthroughReceipts.map((receipt) => (
                    <BreakthroughChip
                      key={`${receipt.nodeName}-${receipt.date}-${receipt.beforeState}`}
                      nodeName={receipt.nodeName}
                      beforeState={receipt.beforeState}
                      afterState={receipt.afterState}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <footer className="border-t border-violet-200 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
              Public record
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--mx-indigo)]">
              {siteHost}/rank/{data.username}
            </p>
          </div>
          <p className="max-w-xs text-right text-xs leading-relaxed text-[#475569]">
            {previewMode
              ? "Preview only. Sign up to publish this passport."
              : "Server verified record. First attempt only. No self reported scores."}
          </p>
        </div>
        <p className="mt-3 text-right text-[10px] text-[#94A3B8]">
          {previewMode
            ? "First attempts after signup lock rank. Practice never rewrites them."
            : "This record is live. It updates as rank changes."}
        </p>
      </footer>
    </article>
  );
}
