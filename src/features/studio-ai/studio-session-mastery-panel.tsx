"use client";

import { useEffect, useState, useTransition } from "react";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { getStudioSessionMasteryContext } from "@/features/studio-ai/load-studio-session-mastery";
import { STUDIO_LOOP } from "@/features/studio-ai/studio-loop-copy-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

export function StudioSessionMasteryPanel({
  sessionId,
  followUpTopics,
  published,
  onBehalfOfTutorId,
}: {
  sessionId: string;
  followUpTopics: string[];
  published: boolean;
  onBehalfOfTutorId?: string;
}) {
  const [context, setContext] = useState<Awaited<ReturnType<typeof getStudioSessionMasteryContext>>>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (published) return;
    startTransition(async () => {
      setError(null);
      try {
        const data = await getStudioSessionMasteryContext(
          sessionId,
          followUpTopics,
          onBehalfOfTutorId,
        );
        setContext(data);
      } catch {
        setError(STUDIO_LOOP.masteryUnavailable);
        setContext(null);
      }
    });
  }, [sessionId, followUpTopics, published, onBehalfOfTutorId]);

  if (published) return null;

  return (
    <section className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/25 p-5">
      <h3 className={`text-sm font-bold ${mentrixStudent.textOnLight}`}>{STUDIO_LOOP.masteryTitle}</h3>
      <p className={`mt-1 text-xs ${mentrixStudent.textMutedOnLight}`}>{STUDIO_LOOP.masterySub}</p>
      {pending ? (
        <p className={`mt-4 text-sm ${mentrixStudent.textMutedOnLight}`}>{STUDIO_LOOP.masteryLoading}</p>
      ) : null}
      {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}
      {!pending && !context ? (
        <p className={`mt-4 text-sm ${mentrixStudent.textMutedOnLight}`}>{STUDIO_LOOP.masteryUnavailable}</p>
      ) : null}
      {context ? (
        <div className="mt-4">
          <p className={`mb-3 text-xs font-medium ${mentrixStudent.textMutedOnLight}`}>
            {context.studentDisplayName}
          </p>
          {context.mode === "call_nodes" ? (
            <p className={`mb-3 text-xs font-medium ${mentrixStudent.textMutedOnLight}`}>
              {STUDIO_LOOP.masteryCallNodesLabel}
            </p>
          ) : null}
          {context.mode === "full_grid" ? (
            <p className={`mb-3 text-xs ${mentrixStudent.textMutedOnLight}`}>
              {STUDIO_LOOP.masteryNoCallNodes}
            </p>
          ) : null}
          <MasteryGrid
            data={context.masteryGrid}
            showLegend
            readOnly
            pinnedNodeIds={context.mode === "call_nodes" ? context.coveredNodeIds : undefined}
            remainderCollapsed={context.mode === "call_nodes"}
          />
        </div>
      ) : null}
    </section>
  );
}
