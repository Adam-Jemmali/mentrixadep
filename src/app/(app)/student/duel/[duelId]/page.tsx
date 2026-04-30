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
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <BackButton />
          <span className="text-xs font-mono text-slate-400 uppercase">
            {duel.status}
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Skill duel</h1>
        <p className="text-sm text-slate-500 mt-1 font-mono">{duel.division_key}</p>

        <div className="mt-8 space-y-6">
          {showInviteeActions && <DuelInviteeActions duelId={duel.id} />}
          <DuelPlayClient duel={duel} side={side} />
        </div>
      </main>
    </div>
  );
}
