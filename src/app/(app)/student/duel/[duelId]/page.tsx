import { notFound } from "next/navigation";
import { requireRole } from "@/shared/core/auth";
import { getDuelForUser, getLearnerPreview } from "@/features/duels/duel-reads";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { DuelPlayClient } from "./duel-play-client";
import { DuelInviteeActions } from "./duel-invitee-actions";
import { DuelWagerProposeCard } from "@/features/duels/ui/duel-wager-propose-card";
import { loadDuelXpWager } from "@/features/duels/duel-wager";
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

  const wager = await loadDuelXpWager(duel.id).catch(() => null);

  const admin = createAdminClient();
  const challengerPreview = duel.student_id
    ? await getLearnerPreview(admin, duel.student_id)
    : null;
  const challengerName = challengerPreview?.name ?? "Challenger";

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

  const showWagerPropose =
    duel.status === "pending" &&
    user.id === duel.student_id &&
    !duel.is_ai_opponent &&
    wager == null;

  const showWagerPendingNote =
    duel.status === "pending" &&
    user.id === duel.student_id &&
    wager?.status === "pending";

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
          {showWagerPropose ? <DuelWagerProposeCard duelId={duel.id} /> : null}
          {showWagerPendingNote ? (
            <section className={cn(mentrixStudent.hubNotebook, "space-y-1 px-5 py-4")}>
              <p className="mx-hub-ink-title text-sm">
                Stake set: {wager.challengerWager} XP
              </p>
              <p className="mx-hub-ink-muted text-sm leading-relaxed">
                Waiting on opponent.
              </p>
            </section>
          ) : null}
          {showInviteeActions ? (
            <DuelInviteeActions
              duelId={duel.id}
              wager={wager}
              challengerName={challengerName}
            />
          ) : null}
          <DuelPlayClient duel={duel} side={side} viewerUserId={user.id} />
        </div>
      </main>
    </div>
  );
}
