"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ThumbsDown,
  ThumbsUp,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  escalateResolveToTutor,
  saveResolveToStudyNotes,
  setResolveHelpful,
  type ResolveProblemRow,
} from "@/app/actions/resolve";

export function ResolveProblemClient({ problem }: { problem: ResolveProblemRow }) {
  const [isPending, startTransition] = useTransition();
  const [helpful, setHelpful] = useState<boolean | null>(problem.was_helpful);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(problem.tutor_escalated);

  const ai = problem.ai_response;
  const bookTutorLink = useMemo(
    () => `/student?subject=${encodeURIComponent(problem.subject)}#browse-guides`,
    [problem.subject],
  );

  const submitHelpful = (value: boolean) => {
    setHelpful(value);
    startTransition(async () => {
      const res = await setResolveHelpful(problem.id, value);
      if ("error" in res) {
        setHelpful(problem.was_helpful);
      }
    });
  };

  const escalate = () => {
    startTransition(async () => {
      const res = await escalateResolveToTutor(problem.id);
      if (!("error" in res)) {
        setEscalated(true);
      }
    });
  };

  const saveToNotes = () => {
    setSaveError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveResolveToStudyNotes(problem.id);
      if ("error" in res) {
        setSaveError(res.error);
      } else {
        setSaved(true);
      }
    });
  };

  if (!ai) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Resolve is still generating your solution. Refresh in a few seconds.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
            {problem.subject}
          </span>
          <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
            {problem.difficulty.replaceAll("_", " ")}
          </span>
          {ai.assignmentLikely && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Assignment-like
            </span>
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Your Resolve solution</h1>
        <p className="text-sm text-slate-700 leading-relaxed">{ai.summary}</p>
        {ai.disclaimer && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {ai.disclaimer}
          </div>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">How to approach this</h2>
        {ai.approach.length > 0 ? (
          <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
            {ai.approach.map((step, i) => (
              <li key={`approach-${i}`}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No approach steps returned.</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Step-by-step explanation</h2>
        {ai.explanationSteps.length > 0 ? (
          <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
            {ai.explanationSteps.map((step, i) => (
              <li key={`explain-${i}`}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No explanation steps returned.</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick checks</h2>
        {ai.checks.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
            {ai.checks.map((check, i) => (
              <li key={`check-${i}`}>{check}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No checks returned.</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Final answer</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          {ai.finalAnswer ?? "No direct final answer was provided. Focus on the approach and checks above."}
        </p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-2">Was this helpful?</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => submitHelpful(true)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                helpful === true
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ThumbsUp className="h-4 w-4" /> Helpful
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => submitHelpful(false)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                helpful === false
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ThumbsDown className="h-4 w-4" /> Not really
            </button>
          </div>
        </div>

        {helpful === false && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Book a session with a {problem.subject} Guide?
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={bookTutorLink}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Book Guide <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              {!escalated && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={escalate}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Mark for tutor escalation
                </button>
              )}
              {escalated && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Escalation saved
                </span>
              )}
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            disabled={isPending}
            onClick={saveToNotes}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" /> Save to Study Notes
          </button>
          {saved && <p className="mt-2 text-xs text-emerald-700">Saved to your study notes.</p>}
          {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
        </div>
      </section>
    </div>
  );
}
