import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { getSiteUrl } from "@/shared/core/site";
import type { RankCardData } from "@/features/rank-card/types";
import { RankCardAccuracyChart } from "@/features/rank-card/rank-card-accuracy-chart";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
}

function RankCardTopBar() {
  return (
    <div className="mx-auto mb-8 flex w-full max-w-4xl items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <span className="text-sm font-semibold tracking-wide text-slate-100">Mentrixa Rank Card</span>
      <Link href="/" className="text-sm font-medium text-indigo-200 hover:text-white">
        Back to homepage
      </Link>
    </div>
  );
}

export function RankCardPublicPage({ data }: { data: RankCardData }) {
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const rankVisual = getAccountRankByLevel(data.globalRankLevel);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-12">
      <RankCardTopBar />

      {/* Header */}
      <header className="mb-14 flex flex-col gap-6 border-b border-white/10 pb-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <RankBadge
            rank={{ level: data.globalRankLevel, title: data.globalRankTitle }}
            size="lg"
            showLabel
            labelTone="dark"
          />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-200">
              {data.username}
            </p>
            <h1 className="text-3xl font-black italic tracking-tight text-white sm:text-4xl">
              {data.displayName}
            </h1>
            <p
              className="mt-1 text-sm font-bold uppercase tracking-widest"
              style={{ color: rankVisual.labelOnDark }}
            >
              {normalizeRankTitle(data.globalRankTitle)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Image src={MENTRIXA_LOGO_PNG} alt="" width={28} height={28} className="opacity-90" />
          <span className="font-mono text-sm text-slate-200">{siteHost}</span>
        </div>
      </header>

      <p className="mb-12 text-center text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
        Verified competitive performance record
      </p>

      {data.warBadges.length > 0 ? (
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {data.warBadges.map((badge) => (
            <span
              key={`${badge.divisionName}-${badge.expiresAt}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200"
            >
              <Trophy className="h-3 w-3" aria-hidden />
              War Winner · {badge.divisionName}
            </span>
          ))}
        </div>
      ) : null}

      {data.subjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-indigo-400/40 bg-white/5 p-12 text-center">
          <p className="text-sm leading-relaxed text-slate-200">
            No subjects with enough verified quest data yet. Complete 6+ quests in a subject to
            appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {data.subjects.map((subject) => {
            const subjectRank = getAccountRankByLevel(subject.rankLevel);
            return (
              <section
                key={subject.subject}
                className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-xl shadow-black/20 backdrop-blur-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black italic text-white">{subject.subject}</h2>
                    <p
                      className="mt-1 text-xs font-bold uppercase tracking-widest"
                      style={{ color: subjectRank.labelOnDark }}
                    >
                      {normalizeRankTitle(subject.rankTitle)} · {subject.currentAccuracy}% accuracy
                    </p>
                  </div>
                  <RankBadge
                    rank={{ level: subject.rankLevel, title: subject.rankTitle }}
                    size="md"
                    labelTone="dark"
                  />
                </div>

                <div className="mt-8">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Quest accuracy trend (90 days)
                  </p>
                  <RankCardAccuracyChart data={subject.accuracyTrend} />
                </div>

                {isApCalculusAbSubject(subject.subject) &&
                subject.verifiedFirstAttemptSummary ? (
                  <p className="mt-6 text-sm text-slate-200">
                    {subject.verifiedFirstAttemptSummary}
                  </p>
                ) : null}

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <Stat label="Duel win rate" value={`${subject.duelWinRate}%`} />
                  <Stat
                    label="vs peers at rank"
                    value={
                      subject.peerDuelWinRate != null ? `${subject.peerDuelWinRate}%` : "—"
                    }
                  />
                  <Stat label="Guide sessions" value={String(subject.guideSessionsCompleted)} />
                </div>

                {subject.breakthroughs.length > 0 ? (
                  <div className="mt-8">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-300">
                      Breakthrough events
                    </p>
                    <ul className="space-y-2">
                      {subject.breakthroughs.map((b) => (
                        <li
                          key={`${b.date}-${b.concept}-${b.prePercent}`}
                          className="text-sm text-slate-200"
                        >
                          <span className="font-mono font-semibold text-indigo-200">{b.date}</span>
                          {": "}
                          {b.concept} — {b.prePercent}% to {b.postPercent}%
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="mt-6 text-xs text-slate-400">
                  Last activity:{" "}
                  <span className="text-slate-200">{formatDate(subject.lastActivityAt)}</span>
                </p>
              </section>
            );
          })}
        </div>
      )}

      <footer className="mt-16 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-sm">
        <p className="text-sm leading-relaxed text-slate-200">
          All data generated from competitive performance on Mentrixa.
          <br />
          Not self-reported. Not a course completion.
          <br />
          Demonstrated under pressure against real competition.
        </p>
        <Link
          href="/try"
          className="mt-6 inline-block text-sm font-bold uppercase tracking-widest text-indigo-200 hover:text-white"
        >
          Prove what you know →
        </Link>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{label}</p>
      <p className="mt-1 font-mono text-xl font-black text-white">{value}</p>
    </div>
  );
}

export function RankCardPrivateNotice({ username }: { username: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <RankCardTopBar />
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-200">
          @{username}
        </p>
        <h1 className="mt-4 text-3xl font-black text-white">This Rank Card is private</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-200">
          The Mentrixer who owns this card has chosen to keep their competitive record private.
        </p>
        <Link
          href="/"
          className="mt-8 text-sm font-bold uppercase tracking-widest text-indigo-200 hover:text-white"
        >
          Back to Mentrixa
        </Link>
      </div>
    </div>
  );
}
