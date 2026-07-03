import { notFound } from "next/navigation";
import { requireRole } from "@/shared/core/auth";
import { getDuelForUser } from "@/features/duels/duel-reads";
import { DuelPlayClient } from "./duel-play-client";
import { DuelInviteeActions } from "./duel-invitee-actions";
import { BackButton } from "@/shared/ui/back-button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

interface Props {
  params: Promise<{ duelId: string }>;
}

function formatDivisionKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuelStatus(status: string) {
  return status.replace(/_/g, " ");
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
    <div className={cn(mentrixStudent.pageBgArena, "min-h-[calc(100dvh-4.75rem)]")}>
      <main className={`${mentrixStudent.mainSlim} py-6 sm:py-8`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <BackButton variant="light" href="/student/duel" />
          <span
            className={cn(
              mentrixStudent.hubSticky,
              "mx-hub-type-ui px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]",
            )}
          >
            {formatDuelStatus(duel.status)}
          </span>
        </div>

        <header className={cn(mentrixStudent.pageHeader, "mb-8")}>
          <VocabSectionHeading
            name="duels"
            label="Skill duel"
            surface="light"
            labelClassName="mx-hub-type-ui"
            className="block w-full"
          />
          <h1 className={`mt-4 ${mentrixStudent.pageTitle}`}>Live duel</h1>
          <p className={`mt-2 ${mentrixStudent.pageSubtitle}`}>{formatDivisionKey(duel.division_key)}</p>
        </header>

        <div className="space-y-6">
          {showInviteeActions && <DuelInviteeActions duelId={duel.id} />}
          <DuelPlayClient duel={duel} side={side} />
        </div>
      </main>
    </div>
  );
}
