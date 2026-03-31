import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listStudentDuels } from "@/app/actions/duel";
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

  const [rowsRaw, divisions, initialClan] = await Promise.all([
    listStudentDuels(),
    getDivisionsCatalog(),
    getMyClan(),
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
    const oid = r.student_id === myId ? r.opponent_student_id : r.student_id;
    if (nameById[oid]) continue;
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

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Skill duels</h1>
        <p className="text-sm text-slate-500 mt-1">
          Challenge another learner to the same short quiz; highest score wins. Use matchmaking
          or your clan—no email required. Enable incoming challenges in Settings if you want to
          be paired or challenged.
        </p>

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
                const label = nameById[otherId] ?? "Learner";
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
