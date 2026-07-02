import { requireRole } from "@/shared/core/auth";
import { getDuelHistorySummary, listStudentDuels, getLearnerPreview } from "@/features/duels/duel-reads";
import { getDivisionsCatalog } from "@/features/divisions/leaderboard";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { DuelHub } from "./duel-hub";
import { AccountRankLadder } from "@/features/student-profile/ui/account-rank-ladder";
import { YourDuelsList } from "@/features/student-profile/ui/your-duels-list";
import { mentrixStudent, mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";
import { TiltCard } from "@/shared/ui/tilt-card";
import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

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

  const opponentIds = Array.from(
    new Set(
      rows
        .filter((r) => !r.is_ai_opponent)
        .map((r) => (r.student_id === myId ? r.opponent_student_id : r.student_id))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const opponentMeta = await getCachedUserMetaBatch(opponentIds);
  const nameById: Record<string, string> = {};
  for (const oid of opponentIds) {
    const email = opponentMeta[oid]?.email ?? "";
    nameById[oid] = email
      ? (email.split("@")[0] ?? "").trim() || "Learner"
      : "Learner";
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
          <p className={`${mentrixStudent.sectionEyebrow} inline-flex items-center gap-2`}>
            <MentrixaVocabIcon name="duels" size={16} className="text-violet-300" />
            PvP training
          </p>
          <h1 className={`mt-2 ${mentrixProfileType.pageTitleDisplay}`}>
            AP Calculus AB duels
          </h1>
          <p className={`mt-2 ${mentrixProfileType.pageSubtitleOnDark}`}>
            Timed battles on the only skill tree we ship. Match real Mentrixers or spar while you wait.
          </p>
        </div>

        {stats && stats.totalCompleted > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TiltCard tiltLimit={10} scale={1.03} className={`${mentrixStudent.card} px-3 py-2.5`}>
              <p className={`${mentrixProfileType.statLabel} inline-flex items-center gap-1.5`}>
                <MentrixaVocabIcon name="duels" size={14} className="text-violet-300" title="Record" />
                Record
              </p>
              <div className="mt-1 h-12 w-full max-w-[200px]">
                <ParticleTextEffect 
                  words={[`${stats.wins}W - ${stats.losses}L${stats.ties > 0 ? ` - ${stats.ties}D` : ""}`]} 
                />
              </div>
            </TiltCard>
            <TiltCard tiltLimit={10} scale={1.03} className={`${mentrixStudent.card} px-3 py-2.5`}>
              <p className={`${mentrixProfileType.statLabel} inline-flex items-center gap-1.5`}>
                <MentrixaVocabIcon name="xp" size={14} className="text-violet-200" title="Duels XP" />
                Duels XP
              </p>
              <p className={`mt-0.5 inline-flex items-center gap-1.5 ${mentrixProfileType.statValue}`}>
                <MentrixaVocabIcon name="xp" size={18} className="text-violet-200" title="XP" />
                {stats.xpFromDuels}
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
          <div className={`border-b border-zinc-100 px-4 py-3 ${mentrixProfileType.label}`}>
            Your duels
          </div>
          <YourDuelsList initialRows={rows} myId={myId} nameById={nameById} />
        </TiltCard>
      </div>
    </div>
  );
}
