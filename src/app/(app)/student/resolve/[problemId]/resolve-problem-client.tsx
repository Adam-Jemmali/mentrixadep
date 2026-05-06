"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
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
  const questionPreview = useMemo(() => problem.problem_text.trim(), [problem.problem_text]);

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
      <section id="problem" className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
            {problem.subject}
          </span>
          <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
            {problem.difficulty.replaceAll("_", " ")}
          </span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Your question</h1>
        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{questionPreview}</p>
        {problem.image_url && (
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            <Image
              src={problem.image_url}
              alt="Problem reference image"
              width={960}
              height={540}
              unoptimized
              className="h-auto w-full object-contain"
            />
          </div>
        )}
      </section>

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
              <Image src="/images/pending.webp" alt="Warning" width={12} height={12} />
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

      <section id="hints" className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Hints</h2>
        <div className="space-y-4 text-sm text-slate-700">
          {ai.checks.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick checks</p>
              <ul className="space-y-2 list-disc pl-5">
                {ai.checks.map((check, i) => (
                  <li key={`hint-check-${i}`}>{check}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {ai.finalAnswer && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Answer clue</p>
              <p className="leading-relaxed text-slate-700">{ai.finalAnswer}</p>
            </div>
          )}
        </div>
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
              <Image src="/images/approved.webp" alt="Helpful" width={16} height={16} /> Helpful
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
              <Image src="/images/pending.webp" alt="Not helpful" width={16} height={16} /> Not really
            </button>
          </div>
        </div>

        {helpful === false && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Need another hint inside this solver?
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="#hints"
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Show hints <Image src="/images/book.webp" alt="Open" width={14} height={14} />
              </Link>
              <Link
                href="#problem"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Review question
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
                  <Image src="/images/checks.webp" alt="Saved" width={16} height={16} /> Escalation saved
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
            <Image src="/images/book.webp" alt="Notes" width={16} height={16} /> Save to Study Notes
          </button>
          {saved && <p className="mt-2 text-xs text-emerald-700">Saved to your study notes.</p>}
          {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
        </div>
      </section>
    </div>
  );
}
