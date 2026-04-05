"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeSession } from "@/app/actions/tutor";
import { tutorCancelSession } from "@/app/actions/cancellation";
import { useAdminViewContext } from "@/components/admin-view-context";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

export function TutorSessionActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const [loading, setLoading] = useState<"complete" | "cancel" | null>(null);

  async function onComplete() {
    setLoading("complete");
    try {
      await completeSession(sessionId, viewingAsUserId ?? undefined);
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not complete session");
    } finally {
      setLoading(null);
    }
  }

  async function onCancel() {
    if (!window.confirm("Cancel this session for the learner? They will receive a full refund and 500 XP compensation.")) return;
    setLoading("cancel");
    try {
      const result = await tutorCancelSession(sessionId, viewingAsUserId ?? undefined);
      if (result.success) {
        window.alert(`Session cancelled. Student refunded and awarded ${result.xpAwarded || 500} XP.`);
      }
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not cancel session");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        className="text-xs h-8 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
        disabled={loading !== null}
        onClick={() => void onComplete()}
      >
        {loading === "complete" ? (
          "…"
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
            Mark complete
          </span>
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        disabled={loading !== null}
        onClick={() => void onCancel()}
      >
        {loading === "cancel" ? (
          "…"
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
            Cancel
          </span>
        )}
      </Button>
    </div>
  );
}
