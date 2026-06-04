import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getDuelForUser } from "@/app/actions/duel";
import { DuelPlayClient } from "./duel-play-client";
import { DuelInviteeActions } from "./duel-invitee-actions";
import { BackButton } from "@/components/ui/back-button";

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
    <div className="min-h-screen bg-slate-100">
      <main className="mx-surface-light mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <BackButton />
          <span className="font-mono text-xs uppercase tracking-wide text-zinc-500">
            {duel.status}
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
          Skill duel
        </h1>
        <p className="mt-1 font-mono text-sm text-zinc-600">{duel.division_key}</p>

        <div className="mt-8 space-y-6">
          {showInviteeActions && <DuelInviteeActions duelId={duel.id} />}
          <DuelPlayClient duel={duel} side={side} />
        </div>
      </main>
    </div>
  );
}
