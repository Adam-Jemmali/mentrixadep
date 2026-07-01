import { notFound } from "next/navigation";
import { requireRole } from "@/shared/core/auth";
import { getDuelForUser } from "@/features/duels/duel-reads";
import { DuelPlayClient } from "./duel-play-client";
import { DuelInviteeActions } from "./duel-invitee-actions";
import { BackButton } from "@/shared/ui/back-button";
import { mentrixStudent, mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";

interface Props {
  params: Promise<{ duelId: string }>;
}

export default async function DuelDetailPage({ params }: Props) {
  const { duelId } = await params;
  const user = await requireRole(["student", "admin"]);

  const duel = await getDuelForUser(duelId);
  if ("error" in duel) notFound();

  const side =
    user.id === duel.student_id
      ? "challenger"
      : user.id === duel.opponent_student_id
        ? "opponent"
        : "challenger";

  const showInviteeActions =
    duel.status === "pending" &&
    duel.opponent_student_id != null &&
    user.id === duel.opponent_student_id;

  return (
    <div className={mentrixStudent.pageBgArena}>
      <main className={`${mentrixStudent.mainSlim} mx-panel-brand`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <BackButton />
          <span className="font-mono text-xs uppercase tracking-wide text-violet-300/80">
            {duel.status}
          </span>
        </div>
        <h1 className={`${mentrixProfileType.pageTitleOnDark} sm:text-2xl`}>
          Skill duel
        </h1>
        <p className="mt-1 font-mono text-sm text-violet-200/80">{duel.division_key}</p>

        <div className="mt-8 space-y-6">
          {showInviteeActions && <DuelInviteeActions duelId={duel.id} />}
          <DuelPlayClient duel={duel} side={side} />
        </div>
      </main>
    </div>
  );
}
