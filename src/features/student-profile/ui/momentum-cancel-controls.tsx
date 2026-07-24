"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import {
  CancelMomentumRenewalConfirmDialog,
  ResumeMomentumRenewalConfirmDialog,
} from "@/shared/ui/alert-dialog-patterns";
import {
  cancelMomentumSubscription,
  resumeMomentumSubscription,
} from "@/features/payments/cancel-momentum-subscription";
import { resolveMomentumCancelEligibility } from "@/features/payments/subscription-cancel-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { cn } from "@/shared/core/utils";

type MomentumCancelControlsProps = {
  subscription: StudentSubscriptionRow | null;
  momentumCompMember?: boolean;
  className?: string;
};

export function MomentumCancelControls({
  subscription,
  momentumCompMember = false,
  className,
}: MomentumCancelControlsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ verdict: string; nextAction: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligibility = resolveMomentumCancelEligibility({
    subscription,
    momentumCompMember,
  });

  if (!eligibility.canCancel && !eligibility.canResume) {
    return null;
  }

  const periodEndLabel = eligibility.periodEndLabel;

  return (
    <div className={cn("space-y-3", className)}>
      {eligibility.canCancel ? (
        <CancelMomentumRenewalConfirmDialog
          periodEndLabel={periodEndLabel}
          confirming={pending}
          onConfirm={async () => {
            setPending(true);
            setError(null);
            try {
              const result = await cancelMomentumSubscription();
              if (!result.ok) {
                setError(result.error);
                return false;
              }
              setFeedback({ verdict: result.verdict, nextAction: result.nextAction });
              router.refresh();
              return true;
            } finally {
              setPending(false);
            }
          }}
          trigger={
            <Button
              type="button"
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
              disabled={pending}
            >
              Cancel membership renewal
            </Button>
          }
        />
      ) : null}

      {eligibility.canResume ? (
        <ResumeMomentumRenewalConfirmDialog
          periodEndLabel={periodEndLabel}
          confirming={pending}
          onConfirm={async () => {
            setPending(true);
            setError(null);
            try {
              const result = await resumeMomentumSubscription();
              if (!result.ok) {
                setError(result.error);
                return false;
              }
              setFeedback({ verdict: result.verdict, nextAction: result.nextAction });
              router.refresh();
              return true;
            } finally {
              setPending(false);
            }
          }}
          trigger={
            <Button
              type="button"
              variant="outline"
              className="border-[var(--mx-indigo)] text-[#4F46E5] hover:bg-violet-100"
              disabled={pending}
            >
              Resume membership renewal
            </Button>
          }
        />
      ) : null}

      {feedback ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-900">{feedback.verdict}</p>
          <p className={cn("mt-1 text-xs", mentrixHubSurfaces.inkMuted)}>{feedback.nextAction}</p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
