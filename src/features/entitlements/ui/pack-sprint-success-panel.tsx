import Link from "next/link";
import { Button } from "@/shared/ui/button";
import {
  buildPackSprintSuccessMessages,
  type PackSprintState,
} from "@/features/entitlements/pack-sprint-pure";

type PackSprintSuccessPanelProps = {
  packSprint: PackSprintState | null;
  daysUntilExam: number | null;
};

export function PackSprintSuccessPanel({ packSprint, daysUntilExam }: PackSprintSuccessPanelProps) {
  const { title, verdict, nextAction } = buildPackSprintSuccessMessages({
    packSprint,
    daysUntilExam,
  });

  return (
    <div className="mt-8 mb-2 rounded-2xl border border-violet-400/35 bg-violet-950/40 px-5 py-4 text-sm text-violet-100 shadow-sm">
      <p className="font-medium text-violet-50">{title}</p>
      <p className="mt-1 text-violet-100/90">{verdict}</p>
      <p className="mt-2 text-sm font-medium text-violet-50">{nextAction}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild size="sm" className="min-h-10">
          <Link href="#browse-guides">Book sprint session</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="min-h-10 border-violet-400/40 text-violet-50">
          <Link href="/student/guides">Browse Guides</Link>
        </Button>
      </div>
    </div>
  );
}
