import { Suspense } from "react";
import { requireRole } from "@/shared/core/auth";
import { getDuelHistorySummary, listStudentDuels, getLearnerPreview } from "@/features/duels/duel-reads";
import { getDivisionsCatalog } from "@/features/divisions/leaderboard";
import { AP_CALC_AB_DIVISION_KEY } from "@/features/divisions/ap-calc-ab-division";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { DuelHub } from "./duel-hub";
import { DuelChallengeUrlHost } from "@/features/duels/ui/duel-challenge-url-host";
import { AccountRankLadder } from "@/features/student-profile/ui/account-rank-ladder";
import { YourDuelsList } from "@/features/student-profile/ui/your-duels-list";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { ProductPageHeader } from "@/features/student-profile/ui/product-page-header";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { landingStickyVariantForIndex, STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";
import { TiltCard } from "@/shared/ui/tilt-card";
import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { MentrixaVocabIcon, XpIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_DUELS_ICON } from "@/shared/icons/vocab-canonical";

export const metadata = { title: "Skill duels. Mentrixa" };

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
    <div className={mentrixStudent.pageBgHub}>
      <div className={mentrixStudent.mainWide}>
        <ProductPageHeader
          icon="duels"
          eyebrow="Duels"
          title="AP Calculus AB duels"
          subtitle="Timed battles on the only skill tree we ship. Match real Mentrixers or spar while you wait."
          stickyVariant={STUDENT_ROUTE_HEADER_VARIANT.duels}
        />

        {stats && stats.totalCompleted > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TiltCard tiltLimit={10} scale={1.03} className="block">
              <StudentStickyNote variant={landingStickyVariantForIndex(0)} className="px-3 py-2.5">
              <p className={`${mentrixStudent.sectionEyebrow} inline-flex items-center gap-2`}>
                <MentrixaVocabIcon name={CANONICAL_DUELS_ICON} size={32} surface="light" title="Record" />
                Record
              </p>
              <div className="mt-1 h-12 w-full max-w-[200px]">
                <ParticleTextEffect 
                  words={[`${stats.wins}W - ${stats.losses}L${stats.ties > 0 ? ` - ${stats.ties}D` : ""}`]} 
                />
              </div>
              </StudentStickyNote>
            </TiltCard>
            <TiltCard tiltLimit={10} scale={1.03} className="block">
              <StudentStickyNote variant={landingStickyVariantForIndex(1)} className="px-3 py-2.5">
              <p className={`${mentrixStudent.sectionEyebrow} inline-flex items-center gap-2`}>
                <XpIcon size={32} title="Duels XP" />
                Duels XP
              </p>
              <p className={`mt-0.5 inline-flex items-center gap-2 text-xl font-black tabular-nums text-[#0B1220]`}>
                <XpIcon size={32} title="XP" />
                {stats.xpFromDuels}
              </p>
              </StudentStickyNote>
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
          <Suspense fallback={null}>
            <DuelChallengeUrlHost
              defaultDivisionKey={
                preferredDuelDivision ?? divisions[0]?.key ?? AP_CALC_AB_DIVISION_KEY
              }
            />
          </Suspense>
        </div>


        <TiltCard tiltLimit={3} className="mt-8 block overflow-hidden">
          <StudentStickyNote variant="pinned" className="overflow-hidden p-0">
          <div className={`border-b border-[#C4B5FD] px-4 py-3 ${mentrixStudent.sectionEyebrow}`}>
            Your duels
          </div>
          <YourDuelsList initialRows={rows} myId={myId} nameById={nameById} />
          </StudentStickyNote>
        </TiltCard>
      </div>
    </div>
  );
}
