"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DivisionDetailPayload } from "@/app/actions/divisions";
import { joinDivision, postDivisionMessage } from "@/app/actions/divisions";
import { setFocusedDivision } from "@/app/actions/quest";
import { getDivisionTheme } from "@/lib/division-ui";
import { Button } from "@/components/ui/button";

function mapTierToLevelName(tier: string): string {
  if (tier === "bronze") return "Learner";
  if (tier === "silver") return "Scholar";
  if (tier === "gold") return "Expert";
  return "Master";
}

export function DivisionDetailClient({
  divisionKey,
  initial,
}: {
  divisionKey: string;
  initial: DivisionDetailPayload;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const theme = getDivisionTheme(divisionKey);

  const onJoin = () => {
    setBanner(null);
    startTransition(async () => {
      const r = await joinDivision(divisionKey);
      setBanner(r.success ? null : r.error);
      if (r.success) router.refresh();
    });
  };

  const onFocus = () => {
    setBanner(null);
    startTransition(async () => {
      const r = await setFocusedDivision(divisionKey);
      setBanner(r.success ? "Focused division updated." : r.error);
      if (r.success) router.refresh();
    });
  };

  const onPost = (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const text = msg.trim();
    if (!text) return;
    startTransition(async () => {
      const r = await postDivisionMessage(divisionKey, text);
      if (!r.success) {
        setBanner(r.error);
        return;
      }
      setMsg("");
      router.refresh();
    });
  };

  const formatWhen = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <nav className="text-xs text-slate-500">
          <Link href="/student/division" className="hover:text-mentrixa-600">
            Divisions
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-800 font-medium">{initial.division.name}</span>
        </nav>

        <header
          className={`relative overflow-hidden rounded-2xl border border-slate-200/80 p-6 sm:p-8 text-white shadow-lg bg-gradient-to-br ${theme.gradient}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold bg-white/15 backdrop-blur-sm"
                  aria-hidden
                >
                  {theme.emoji}
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/75">
                    Division
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{initial.division.name}</h1>
                </div>
              </div>
              {initial.division.description ? (
                <p className="mt-3 max-w-2xl text-sm text-white/90 leading-relaxed">
                  {initial.division.description}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center lg:text-right">
              <div>
                <p className="text-2xl font-mono font-bold tabular-nums" data-stat="members">
                  {initial.memberCount}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-white/70">Members</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold tabular-nums">{initial.weeklyPoolXp}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/70">Weekly XP pool</p>
              </div>
              <div>
                <p className="text-xs font-mono text-white/90">{initial.weekStart}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/70">Week start (UTC)</p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2">
            {!initial.isMember ? (
              <Button
                type="button"
                disabled={pending}
                onClick={onJoin}
                className="bg-white text-slate-900 hover:bg-white/90"
              >
                Join division
              </Button>
            ) : (
              <>
                <span className="text-xs text-white/90 self-center font-medium px-2">You’re a member</span>
                {!initial.isFocused ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={onFocus}
                    className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    Set as focus
                  </Button>
                ) : (
                  <span className="text-xs text-amber-200 font-semibold self-center px-2">
                    Focused division
                  </span>
                )}
              </>
            )}
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/student/duel">Skill duels</Link>
            </Button>
            <Button type="button" variant="outline" asChild className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/student/quest">Quest lab</Link>
            </Button>
          </div>
        </header>

        {banner ? (
          <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {banner}
          </p>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Weekly XP · Top 50</h2>
          <p className="text-xs text-slate-500">
            Resets every Monday 00:00 UTC. Top 3 each week earn bonus XP (500 / 250 / 100) after the cron
            job runs.
          </p>
          <LeaderboardTableWeekly rows={initial.weeklyLeaderboard} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">All-time division XP</h2>
          <LeaderboardTableAllTime rows={initial.allTimeLeaderboard} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          <ul className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {initial.activity.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-500">No recent quest completions in this division.</li>
            ) : (
              initial.activity.map((a, i) => (
                <li key={`${a.userId}-${a.completedAt}-${i}`} className="px-4 py-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{a.displayName}</span> just completed a Quest
                  in this division
                  <span className="text-slate-400 text-xs ml-2">{formatWhen(a.completedAt)}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming duels</h2>
          <ul className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {initial.duels.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-500">
                No pending or active duels in this division.{" "}
                <Link href="/student/duel" className="text-mentrixa-600 hover:underline">
                  Open duel hub
                </Link>
              </li>
            ) : (
              initial.duels.map((d) => (
                <li key={d.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-sm text-slate-800">
                    <span className="font-medium">{d.studentName}</span>
                    <span className="text-slate-500"> vs </span>
                    <span className="font-medium">{d.opponentName}</span>
                  </span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">
                    {d.status} · {formatWhen(d.createdAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Discussion</h2>
          <p className="text-xs text-slate-500">Members only. Be respectful.</p>
          <ul className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 mb-3">
            {initial.messages.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-500">No messages yet.</li>
            ) : (
              initial.messages.map((m) => (
                <li key={m.id} className="px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-900">{m.displayName}</span>
                  <span className="text-xs text-slate-400 ml-2">{formatWhen(m.createdAt)}</span>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">{m.body}</p>
                </li>
              ))
            )}
          </ul>
          {initial.isMember ? (
            <form onSubmit={onPost} className="flex flex-col gap-2">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Say something to your division…"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mentrixa-500/30"
              />
              <Button type="submit" size="sm" disabled={pending || !msg.trim()} className="w-fit">
                Post
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">Join this division to post on the board.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function LeaderboardTableWeekly({
  rows,
}: {
  rows: DivisionDetailPayload["weeklyLeaderboard"];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="py-2 px-3 text-left">#</th>
            <th className="py-2 px-3 text-left">Name</th>
            <th className="py-2 px-3 text-left">Weekly XP</th>
            <th className="py-2 px-3 text-left">Streak</th>
            <th className="py-2 px-3 text-left">Tier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.userId}
              className={`border-b border-slate-100 last:border-0 ${r.isCurrentUser ? "bg-blue-50/80" : ""}`}
            >
              <td className="py-2 px-3 font-mono text-slate-600">{r.rank}</td>
              <td className="py-2 px-3 font-medium text-slate-900">
                {r.displayName}
                {r.isCurrentUser ? <span className="text-mentrixa-600 ml-1">(you)</span> : null}
              </td>
              <td className="py-2 px-3 font-mono">{r.weeklyXp}</td>
              <td className="py-2 px-3 font-mono text-slate-500">{r.streakDays}d</td>
              <td className="py-2 px-3 text-slate-600">{mapTierToLevelName(r.level.tier)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No weekly XP yet — earn XP in this division this week.</p>
      ) : null}
    </div>
  );
}

function LeaderboardTableAllTime({
  rows,
}: {
  rows: DivisionDetailPayload["allTimeLeaderboard"];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="py-2 px-3 text-left">#</th>
            <th className="py-2 px-3 text-left">Name</th>
            <th className="py-2 px-3 text-left">Division XP</th>
            <th className="py-2 px-3 text-left">Streak</th>
            <th className="py-2 px-3 text-left">Tier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.userId}
              className={`border-b border-slate-100 last:border-0 ${r.isCurrentUser ? "bg-blue-50/80" : ""}`}
            >
              <td className="py-2 px-3 font-mono text-slate-600">{r.rank}</td>
              <td className="py-2 px-3 font-medium text-slate-900">
                {r.displayName}
                {r.isCurrentUser ? <span className="text-mentrixa-600 ml-1">(you)</span> : null}
              </td>
              <td className="py-2 px-3 font-mono">{r.divisionXp}</td>
              <td className="py-2 px-3 font-mono text-slate-500">{r.streakDays}d</td>
              <td className="py-2 px-3 text-slate-600">{mapTierToLevelName(r.level.tier)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No all-time XP in this division yet.</p>
      ) : null}
    </div>
  );
}
