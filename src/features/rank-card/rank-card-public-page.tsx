import Link from "next/link";
import Image from "next/image";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { getSiteUrl } from "@/shared/core/site";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { PassportVerdict, RankCardData } from "@/features/rank-card/types";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { RankBreakdownPopover } from "@/shared/ui/popover-patterns";
import { passportVerdictPlainText } from "@/features/rank-card/rank-passport-pure";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

const VERIFIED_GOLD = "#D4A017";

function PassportVerdictHeadline({ verdict }: { verdict: PassportVerdict }) {
  if (verdict.kind === "ranked") {
    return (
      <p className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
        Top{" "}
        <span className="font-black" style={{ color: VERIFIED_GOLD }}>
          {verdict.topPercent}
        </span>{" "}
        percent of everyone verified on {AP_CALC_AB_SUBJECT}, first attempt only, no retakes
      </p>
    );
  }

  return (
    <p className="text-xl font-semibold leading-relaxed text-white sm:text-2xl">
      {passportVerdictPlainText(verdict)}
    </p>
  );
}

function RankPassportTopBar() {
  return (
    <div className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0F172A]/60 px-4 py-3">
      <span className={mentrixStudent.sectionEyebrow}>Verified rank passport</span>
      <Link href="/" className="text-sm font-medium text-indigo-200 hover:text-white">
        Mentrixa
      </Link>
    </div>
  );
}

export function RankCardPublicPage({ data }: { data: RankCardData }) {
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const rankVisual = getAccountRankByLevel(data.rankLevel);
  const isTopTier = rankVisual.key === "mentrixer";

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-12">
      <RankPassportTopBar />

      <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <RankBadge
            rank={{ level: data.rankLevel, title: data.rankTitle }}
            size="lg"
            showLabel
            labelTone="dark"
            surface="onDark"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200/90">
              @{data.username}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {data.displayName}
            </h1>
            <p
              className="mt-1 text-sm font-semibold uppercase tracking-[0.14em]"
              style={{ color: isTopTier ? VERIFIED_GOLD : rankVisual.labelOnDark }}
            >
              {normalizeRankTitle(data.rankTitle)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Image src={MENTRIXA_LOGO_PNG} alt="" width={24} height={24} className="opacity-80" />
          <span className="font-mono text-xs text-slate-300">{siteHost}/rank/{data.username}</span>
        </div>
      </header>

      {data.masteryGrid ? (
        <div className="mb-8">
          <MasteryGrid data={data.masteryGrid} showLegend readOnly />
        </div>
      ) : null}

      <section className="mb-8 rounded-2xl border border-white/10 bg-[#0F172A]/90 p-6 sm:p-8">
        <PassportVerdictHeadline verdict={data.passportVerdict} />
        {data.verifiedSkillCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs tabular-nums text-slate-500">
              {data.verifiedSkillCount} verified skill{data.verifiedSkillCount === 1 ? "" : "s"}
              {data.verifiedPercentile != null
                ? ` · ${Math.round(data.verifiedPercentile)}th percentile cohort accuracy`
                : ""}
            </p>
            <RankBreakdownPopover
              stats={{
                verifiedCount: data.verifiedSkillCount,
                accuracyPercent: data.topSubject?.currentAccuracy ?? 0,
                percentile: data.verifiedPercentile,
              }}
              tone="dark"
              triggerLabel="Breakdown"
            />
          </div>
        ) : null}
      </section>

      {data.breakthroughReceipts.length > 0 ? (
        <section className="mb-8">
          <p className={mentrixStudent.sectionEyebrow}>Recent breakthrough receipts</p>
          <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0F172A]/50">
            {data.breakthroughReceipts.map((receipt) => (
              <li
                key={`${receipt.nodeName}-${receipt.date}-${receipt.beforeState}`}
                className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{receipt.nodeName}</p>
                  <p className="text-sm text-slate-300">
                    {receipt.beforeState} to {receipt.afterState}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-xs text-slate-500">{receipt.date}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
        <p className="text-sm text-slate-300">
          Server verified record. First attempts only. No self reported scores.
        </p>
        <p className="mt-2 font-mono text-xs text-slate-500">
          {siteHost}/rank/{data.username}
        </p>
      </footer>
    </div>
  );
}

export function RankCardPrivateNotice({ username }: { username: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <RankPassportTopBar />
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200/90">
          @{username}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white">This passport is private</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
          The owner chose to keep this verified record private.
        </p>
        <Link
          href="/"
          className="mt-8 text-sm font-semibold text-indigo-200 hover:text-white"
        >
          Back to Mentrixa
        </Link>
      </div>
    </div>
  );
}
