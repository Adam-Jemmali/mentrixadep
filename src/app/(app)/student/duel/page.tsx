import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDuelHistorySummary, listStudentDuels } from "@/app/actions/duel";
import { getMyClan } from "@/app/actions/clan";
import { getDivisionsCatalog } from "@/app/actions/quest";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { DuelHub } from "./duel-hub";

export const metadata = { title: "Skill duels · Mentrixa" };

function sortDuels<
  T extends { status: string; created_at: string },
>(rows: T[]): T[] {
  const pri = (s: string) =>
    s === "pending" ? 0 : s === "active" ? 1 : 2;
  return [...rows].sort((a, b) => {
    const d = pri(a.status) - pri(b.status);
    if (d !== 0) return d;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default async function StudentDuelsPage() {
  const user = await requireRole(["student", "admin"]);
  const myId = user.id;

  const [rowsRaw, divisions, initialClan, history] = await Promise.all([
    listStudentDuels(),
    getDivisionsCatalog(),
    getMyClan(),
    getDuelHistorySummary(),
  ]);
  const rows = sortDuels(rowsRaw);

  const admin = createAdminClient();

  const { data: duelSettings } = await admin
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", myId)
    .maybeSingle();
  const preferredDuelDivision =
    typeof duelSettings?.focused_division_key === "string"
      ? duelSettings.focused_division_key.trim()
      : null;

  let initialQueueDivision: string | null = null;
  try {
    const { data: queueRow, error: queueErr } = await admin
      .from("duel_queue")
      .select("division_key")
      .eq("user_id", myId)
      .maybeSingle();
    if (!queueErr) {
      initialQueueDivision = queueRow?.division_key ?? null;
    }
  } catch {
    initialQueueDivision = null;
  }

  const nameById: Record<string, string> = {};
  for (const r of rows) {
    if (r.is_ai_opponent) continue;
    const oid = r.student_id === myId ? r.opponent_student_id : r.student_id;
    if (!oid || nameById[oid]) continue;
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

  const stats = "error" in history ? null : history;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Skill duels
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Same timed questions, live scores, win streaks. Match by subject and level, or use
              your clan. Enable duels in Settings to be challenged.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/student/duel/history">History &amp; stats</Link>
          </Button>
        </div>

        {stats && stats.totalCompleted > 0 ? (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Record
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                {stats.wins}W — {stats.losses}L
                {stats.ties > 0 ? ` — ${stats.ties}D` : ""}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Duels XP
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                {stats.xpFromDuels} XP
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <DuelHub
            divisions={divisions}
            preferredDivisionKey={preferredDuelDivision}
            initialClan={initialClan}
            initialQueueDivision={initialQueueDivision}
            myUserId={myId}
          />
        </div>

        <div className="mt-8 border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
            Your duels
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-sm text-slate-400 text-center">
              No duels yet. Find a match or challenge a clanmate above (your opponent must opt in
              under Settings).
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => {
                const otherId = r.student_id === myId ? r.opponent_student_id : r.student_id;
                const label =
                  r.is_ai_opponent && r.student_id === myId
                    ? "Sparring AI"
                    : otherId
                      ? (nameById[otherId] ?? "Learner")
                      : "Learner";
                return (
                <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">vs {label}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.division_key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 capitalize">{r.status}</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/student/duel/${r.id}`}>Open</Link>
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
