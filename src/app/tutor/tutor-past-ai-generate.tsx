"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateSessionPackage } from "@/app/actions/autoPilot";
import { useAdminViewContext } from "@/components/admin-view-context";

export function TutorPastAiGenerateButton({
  sessionId,
  hasAiPackage,
}: {
  sessionId: string;
  /** Server knows if a package row exists; after a successful generate, refresh updates this. */
  hasAiPackage?: boolean;
}) {
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLocal, setGeneratedLocal] = useState(false);

  const studioHref = viewingAsUserId
    ? `/tutor/sessions-ai?tutorId=${viewingAsUserId}`
    : "/tutor/sessions-ai";

  const showGenerated = hasAiPackage || generatedLocal;

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateSessionPackage(sessionId, viewingAsUserId ?? undefined);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setGeneratedLocal(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (showGenerated) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Link
          href={studioHref}
          className="text-xs font-medium text-emerald-700 hover:underline"
        >
          View package
        </Link>
        <span className="text-[10px] text-slate-400">Open Studio to see details</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={loading}
        className="text-xs text-mentrixa-600 hover:underline disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate"}
      </button>
      {error && <span className="text-[10px] text-red-600 max-w-[140px] leading-tight">{error}</span>}
    </div>
  );
}
