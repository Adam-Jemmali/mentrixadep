"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeSession, cancelSession } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { Button } from "@/components/ui/button";

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
    if (!window.confirm("Cancel this session for the learner?")) return;
    setLoading("cancel");
    try {
      await cancelSession(sessionId, viewingAsUserId ?? undefined);
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
        {loading === "complete" ? "…" : "Mark complete"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        disabled={loading !== null}
        onClick={() => void onCancel()}
      >
        {loading === "cancel" ? "…" : "Cancel"}
      </Button>
    </div>
  );
}
