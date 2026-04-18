"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DivisionDetailPayload } from "@/app/actions/divisions";
import { joinDivision, postDivisionMessage } from "@/app/actions/divisions";
import { setFocusedDivision } from "@/app/actions/quest";
import { getDivisionTheme } from "@/lib/division-ui";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { Button } from "@/components/ui/button";

function mapTierToLevelName(tier: string): string {
  if (tier === "bronze") return "Learner";
  if (tier === "silver") return "Scholar";
  if (tier === "gold") return "Expert";
  return "Master";
}

function RankingAvatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "M";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover bg-slate-100"
      />
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-600">
      {initial}
    </span>
  );
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
      const parts = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }).formatToParts(new Date(iso));

      const month = parts.find((p) => p.type === "month")?.value ?? "";
      const day = parts.find((p) => p.type === "day")?.value ?? "";
      const year = parts.find((p) => p.type === "year")?.value ?? "";
      const hour = parts.find((p) => p.type === "hour")?.value ?? "";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "";
      const dayPeriod =
        (parts.find((p) => p.type === "dayPeriod")?.value ?? "").replace(/\./g, "").toUpperCase();

      if (month && day && year && hour && minute && dayPeriod) {
        return `${month} ${day}, ${year}, ${hour}:${minute} ${dayPeriod}`;
      }

      return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
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
          className={`
            relative overflow-hidden p-6 sm:p-8
            ${mentrixStudent.card}
            before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/mentrixalogo/logo.png')] before:bg-[length:112px_112px] before:bg-repeat before:opacity-[0.06] before:content-['']
          `}
        >
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold text-white bg-gradient-to-br ${theme.gradient}`}
                  aria-hidden
                >
                  {theme.emoji}
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Division
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{initial.division.name}</h1>
                </div>
              </div>
              {initial.division.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {initial.division.description}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center lg:text-right">
              <div>
                <p className="text-2xl font-mono font-bold tabular-nums text-slate-900" data-stat="members">
                  {initial.memberCount}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Members</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold tabular-nums text-slate-900">{initial.weeklyPoolXp}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Weekly XP pool</p>
              </div>
              <div>
                <p className="text-xs font-mono text-slate-700">{initial.weekStart}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Week start (UTC)</p>
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
                <span className="self-center px-2 text-xs font-medium text-slate-700">You&apos;re a member</span>
                {!initial.isFocused ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={onFocus}
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900"
                  >
                    Set as focus
                  </Button>
                ) : (
                  <span className="text-xs text-amber-700 font-semibold self-center px-2">
                    Focused division
                  </span>
                )}
              </>
            )}
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900"
            >
              <Link href="/student/duel">Skill duels</Link>
            </Button>
            <Button type="button" variant="outline" asChild className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900">
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

        {initial.duels.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming duels</h2>
            <ul className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
              {initial.duels.map((d) => (
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
              ))}
            </ul>
          </section>
        ) : null}

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
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <RankingAvatar displayName={r.displayName} avatarUrl={r.avatarUrl} />
                  <span className="font-medium text-slate-900">
                    {r.displayName}
                    {r.isCurrentUser ? <span className="text-mentrixa-600 ml-1">(you)</span> : null}
                  </span>
                </div>
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
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <RankingAvatar displayName={r.displayName} avatarUrl={r.avatarUrl} />
                  <span className="font-medium text-slate-900">
                    {r.displayName}
                    {r.isCurrentUser ? <span className="text-mentrixa-600 ml-1">(you)</span> : null}
                  </span>
                </div>
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
