import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  getDuelHistorySummary,
  listStudentDuels,
} from "@/app/actions/duel";
import { getDivisionsCatalog } from "@/app/actions/quest";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHeadToHeadSummary } from "@/lib/duel-reward";
import { Button } from "@/components/ui/button";
import { DuelRowActions } from "@/components/student/duel-row-actions";

export const metadata = { title: "Duel history · Mentrixa" };

export default async function DuelHistoryPage() {
  const user = await requireRole(["student", "admin"]);
  const myId = user.id;

  const [history, rows, divisions] = await Promise.all([
    getDuelHistorySummary(),
    listStudentDuels(),
    getDivisionsCatalog(),
  ]);

  const stats = "error" in history ? null : history;
  const divName = (key: string) =>
    divisions.find((d) => d.key === key)?.name ?? key;

  const admin = createAdminClient();
  const nameById: Record<string, string> = {};
  const opponentIds = new Set<string>();
  for (const r of rows) {
    if (r.is_ai_opponent) continue;
    const oid = r.student_id === myId ? r.opponent_student_id : r.student_id;
    if (oid) opponentIds.add(oid);
  }

  for (const oid of Array.from(opponentIds)) {
    try {
      const { data } = await admin.auth.admin.getUserById(oid);
      const email = data?.user?.email ?? "";
      nameById[oid] = email
        ? (email.split("@")[0] ?? "").trim() || "Learner"
        : "Learner";
    } catch {
      nameById[oid] = "Learner";
    }
  }

  const headToHead: {
    id: string;
    label: string;
    played: number;
    myWins: number;
    theirWins: number;
    ties: number;
  }[] = [];

  for (const oid of Array.from(opponentIds).slice(0, 12)) {
    const h = await getHeadToHeadSummary(admin, myId, oid);
    if (h.played > 0) {
      headToHead.push({
        id: oid,
        label: nameById[oid] ?? "Learner",
        ...h,
      });
    }
  }
  headToHead.sort((a, b) => b.played - a.played);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/duel">← Skill duels</Link>
          </Button>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Duel history
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Wins, ties, and XP from duels. Streak bonuses and specialist badges
          appear in your activity feed when you earn them.
        </p>

        {stats ? (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Finished
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {stats.totalCompleted}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Wins
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {stats.wins}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Losses
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {stats.losses}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Duels XP
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {stats.xpFromDuels}
              </p>
            </div>
          </div>
        ) : null}

        {stats && stats.byDivision.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-sm font-medium text-slate-900">By subject</h2>
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {stats.byDivision.map((d) => (
                <li
                  key={d.division_key}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-slate-800">{divName(d.division_key)}</span>
                  <span className="text-slate-500 tabular-nums">
                    {d.wins}W / {d.played - d.wins}L
                    <span className="text-slate-300"> · </span>
                    {d.played} played
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {headToHead.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-sm font-medium text-slate-900">
              Head-to-head (learners you’ve faced before)
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {headToHead.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-slate-900">{h.label}</span>
                  <span className="text-slate-600 tabular-nums">
                    {h.myWins}–{h.theirWins}
                    {h.ties > 0 ? ` (${h.ties}D)` : ""}
                    <span className="text-slate-400"> · {h.played} total</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-10">
          <h2 className="text-sm font-medium text-slate-900">Recent duels</h2>
          {rows.filter((r) => r.status === "completed").length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No completed duels yet. Win or lose, you’ll see results here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {rows
                .filter((r) => r.status === "completed")
                .slice(0, 20)
                .map((r) => {
                  const label =
                    r.is_ai_opponent && r.student_id === myId
                      ? "Sparring AI"
                      : r.student_id === myId
                        ? nameById[r.opponent_student_id ?? ""] ?? "Learner"
                        : nameById[r.student_id] ?? "Learner";
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="text-slate-900">vs {label}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {divName(r.division_key)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <DuelRowActions
                          duelId={r.id}
                          status={r.status}
                          myId={myId}
                          studentId={r.student_id}
                          opponentStudentId={r.opponent_student_id}
                        />
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/student/duel/${r.id}`}>Review</Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
