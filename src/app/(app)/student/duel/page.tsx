import { requireRole } from "@/lib/auth";
import { getDuelHistorySummary, listStudentDuels, getLearnerPreview } from "@/app/actions/duel";
import { getDivisionsCatalog } from "@/app/actions/quest";
import { createAdminClient } from "@/lib/supabase/admin";
import { DuelHub } from "./duel-hub";
import { AccountRankLadder } from "@/components/student/account-rank-ladder";
import { YourDuelsList } from "@/components/student/your-duels-list";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { TiltCard } from "@/components/ui/tilt-card";
import { ParticleTextEffect } from "@/components/ui/particle-text-effect";

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
  const admin = createAdminClient();

  const [rowsRaw, divisions, history, currentUser] = await Promise.all([
    listStudentDuels(),
    getDivisionsCatalog(),
    getDuelHistorySummary(),
    getLearnerPreview(admin, myId),
  ]);
  const rows = sortDuels(rowsRaw);

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

  const { data: xpRow } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", myId)
    .maybeSingle();
  const totalXp = typeof xpRow?.total_xp === "number" ? xpRow.total_xp : 0;

  return (
    <div className={mentrixStudent.pageBgArena}>
      <div className={mentrixStudent.mainWide}>
        <div className="mb-10">
          <p className={mentrixStudent.sectionEyebrow}>PvP training & leagues</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Skill duels
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">
            Timed battles. Live scores. Challenge others in real-time or practice with sparring quests.
          </p>
        </div>

        {stats && stats.totalCompleted > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TiltCard tiltLimit={10} scale={1.03} className={`${mentrixStudent.card} px-3 py-2.5`}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Record
              </p>
              <div className="mt-1 h-12 w-full max-w-[200px]">
                <ParticleTextEffect 
                  words={[`${stats.wins}W - ${stats.losses}L${stats.ties > 0 ? ` - ${stats.ties}D` : ""}`]} 
                />
              </div>
            </TiltCard>
            <TiltCard tiltLimit={10} scale={1.03} className={`${mentrixStudent.card} px-3 py-2.5`}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Duels XP
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums">
                {stats.xpFromDuels} XP
              </p>
            </TiltCard>
          </div>
        ) : null}

        <div className="mt-8">
          <AccountRankLadder totalXp={totalXp} variant="arena" className="mb-8" />
          <DuelHub
            divisions={divisions}
            preferredDivisionKey={preferredDuelDivision}
            initialQueueDivision={initialQueueDivision}
            currentUser={currentUser}
          />
        </div>


        <TiltCard tiltLimit={3} className={`${mentrixStudent.card} mt-8 overflow-hidden p-0 block`}>
          <div className="border-b border-zinc-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Your duels
          </div>
          <YourDuelsList initialRows={rows} myId={myId} nameById={nameById} />
        </TiltCard>
      </div>
    </div>
  );
}
