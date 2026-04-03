"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { generateSessionPackage, getSessionPackage } from "@/app/actions/autoPilot";
import type { SessionAiPackage } from "@/lib/database.types";
import { Loader2 } from "lucide-react";

type Phase = "loading" | "ready" | "empty" | "error" | "generating";

export function StudyPackagePanel({
  sessionId,
  initialPackage,
  onQuestClick,
}: {
  sessionId: string;
  initialPackage: SessionAiPackage | null;
  onQuestClick: (prompt: string) => void;
}) {
  const [packageData, setPackageData] = useState<SessionAiPackage | null>(initialPackage);
  const [phase, setPhase] = useState<Phase>(() =>
    initialPackage ? "ready" : "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const loadPackage = useCallback(() => {
    setPhase("loading");
    setErrorMessage(null);
    void getSessionPackage(sessionId).then((result) => {
      if ("error" in result) {
        setPhase("error");
        setErrorMessage(result.error);
        setPackageData(null);
        return;
      }
      const pkg = result.package;
      if (!pkg) {
        setPackageData(null);
        setPhase("empty");
      } else {
        setPackageData(pkg);
        setPhase("ready");
      }
    });
  }, [sessionId]);

  useEffect(() => {
    if (initialPackage) {
      setPackageData(initialPackage);
      setPhase("ready");
      return;
    }
    loadPackage();
  }, [sessionId, initialPackage, loadPackage]);

  useEffect(() => {
    if (panelRef.current && phase === "ready") {
      gsap.from(panelRef.current, { opacity: 0, y: 6, duration: 0.22, ease: "power2.out" });
    }
  }, [phase, sessionId]);

  const toggleCard = (index: number) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  async function handleGenerate() {
    setPhase("generating");
    setErrorMessage(null);
    const res = await generateSessionPackage(sessionId);
    if ("error" in res) {
      setPhase("error");
      setErrorMessage(res.error);
      return;
    }
    setPackageData(res.package);
    setPhase("ready");
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading Studio output…
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="space-y-2 py-4">
        <p className="text-sm font-medium text-slate-800">Generating your study package…</p>
        <p className="text-xs text-slate-500">This usually takes under a minute.</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-3 py-3">
        <p className="text-sm text-red-700">{errorMessage ?? "Could not load package."}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => loadPackage()}>
            Retry
          </Button>
          <Button type="button" size="sm" onClick={() => void handleGenerate()}>
            Generate
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="space-y-3 py-3">
        <p className="text-sm text-slate-600">
          No Studio output yet. Generate a study package with summary, flashcards, and practice prompts.
        </p>
        <Button type="button" size="sm" onClick={() => void handleGenerate()}>
          Generate study package
        </Button>
      </div>
    );
  }

  if (!packageData) return null;

  const flashcards = packageData.flashcards ?? [];
  const quests = packageData.followup_quests ?? [];
  const keyPoints = packageData.key_points ?? [];
  const practiceExercises = packageData.practice_exercises ?? [];
  const followTopics = packageData.follow_up_topics ?? [];

  const hasContent =
    !!packageData.summary?.trim() ||
    keyPoints.length > 0 ||
    quests.length > 0 ||
    flashcards.length > 0 ||
    practiceExercises.length > 0 ||
    followTopics.length > 0;

  if (!hasContent) {
    return (
      <div className="space-y-3 py-3">
        <p className="text-sm text-slate-600">Package exists but has no content yet.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleGenerate()}>
          Regenerate
        </Button>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="space-y-6 pt-2">
      {packageData.summary?.trim() ? (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Session summary
          </h4>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {packageData.summary}
          </p>
        </section>
      ) : null}

      {keyPoints.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Recommended next steps
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-800">
            {keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {practiceExercises.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Practice exercises
          </h4>
          <ul className="space-y-3">
            {practiceExercises.map((ex, i) => (
              <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-sm font-medium text-slate-900">{ex.title}</p>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{ex.prompt}</p>
                {ex.hint ? (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Hint: </span>
                    {ex.hint}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {followTopics.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Follow-up topics
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-800">
            {followTopics.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {quests.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Quest practice
          </h4>
          <ul className="space-y-2">
            {quests.map((quest, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onQuestClick(quest.prompt)}
                  className="text-left text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
                >
                  {quest.prompt}
                </button>
                {quest.difficulty ? (
                  <span className="ml-2 text-[10px] uppercase text-slate-400">{quest.difficulty}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {flashcards.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Flashcards
          </h4>
          <p className="text-xs text-slate-500 mb-3">Tap a card to flip.</p>
          <div className="flex flex-wrap gap-3">
            {flashcards.map((card, index) => {
              const isFlipped = !!flippedCards[index];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleCard(index)}
                  className="relative h-28 w-40 perspective-1000 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs leading-snug shadow-sm transition hover:border-mentrixa-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-500"
                >
                  <span
                    className={`block text-slate-900 ${isFlipped ? "opacity-0" : "opacity-100"}`}
                  >
                    {card.q}
                  </span>
                  <span
                    className={`absolute inset-3 flex items-center rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-900 ${
                      isFlipped ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    {card.a}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
