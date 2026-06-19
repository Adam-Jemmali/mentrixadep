"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { BackButton } from "@/shared/ui/back-button";
import { Input } from "@/shared/ui/input";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import { ShareScoreCardButton } from "@/features/quest/ui/share-score-card";
import {
  createPracticeQuest,
  startPracticeSession,
  getPracticeQuestionPublic,
  submitPracticeMcq,
  submitPracticeWritten,
  finalizePracticeQuest,
  type PracticeQuestionPublic,
} from "@/features/quest/practice-quest";
import { emitXpAward } from "@/features/xp/xp-events";
import { trackClientEvent } from "@/shared/integrations/use-track";
import type { PracticeDifficulty, PracticePackType } from "@/features/quest/practice-quest-types";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { DivisionFocusSelect } from "@/features/student-profile/ui/division-focus-select";
import { BreakthroughCelebrationOverlay } from "@/features/breakthrough-events/breakthrough-overlay";
import { SessionBreakthroughCard } from "@/features/breakthrough-events/session-breakthrough-card";
import { createNextBreakthroughQuest } from "@/features/breakthrough-events/adaptive-quests";
import type { BreakthroughCelebration } from "@/features/breakthrough-events/types";
import type { SessionBreakthroughLine } from "@/features/breakthrough-events/post-session-retest";
import { useBiometricTelemetry } from "@/shared/hooks/useBiometricTelemetry";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { PracticeCorrectCelebration } from "@/features/quest/ui/practice-correct-celebration";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";

const DIFFICULTIES: { value: PracticeDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const PACK_TYPES: { value: PracticePackType; label: string; desc: string }[] = [
  { value: "mcq", label: "Multiple choice", desc: "Instant feedback, 4 options each" },
  {
    value: "short_answer",
    label: "Short answer",
    desc: "Written response with feedback on your reasoning",
  },
  {
    value: "problem_solving",
    label: "Problem solving",
    desc: "Deeper prompts graded against a model answer (math may use LaTeX)",
  },
];

type Phase = "wizard" | "run" | "done";

export function QuestPracticeWorkspace({
  subjectOptions,
  onboardingMode = false,
}: {
  subjectOptions: { key: string; name: string }[];
  onboardingMode?: boolean;
}) {
  const router = useRouter();
  const tier = useUiPerfTier();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [subjectKey, setSubjectKey] = useState(subjectOptions[0]?.key ?? "general");
  const [customSubject, setCustomSubject] = useState("");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("intermediate");
  const [packType, setPackType] = useState<PracticePackType>("mcq");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [questId, setQuestId] = useState<string | null>(null);
  const [timeLimitSec, setTimeLimitSec] = useState(15 * 60);
  const [qIndex, setQIndex] = useState(0);
  const [question, setQuestion] = useState<PracticeQuestionPublic | null>(null);
  const [written, setWritten] = useState("");
  const [mcqPicked, setMcqPicked] = useState<number | null>(null);
  const [mcqResult, setMcqResult] = useState<{
    correct: boolean;
    explanation: string;
    correctIndex: number;
    canContinue: boolean;
  } | null>(null);
  const [writtenFeedback, setWrittenFeedback] = useState<string | null>(null);
  const [writtenAwaitingContinue, setWrittenAwaitingContinue] = useState(false);
  const [correctCelebration, setCorrectCelebration] = useState<{
    explanation: string;
    mode: "mcq" | "written";
  } | null>(null);
  const [doneResult, setDoneResult] = useState<{
    correct: number;
    total: number;
    perfect: boolean;
    xpAwarded: number;
    perfectBonus: number;
    mistakeReviews?: { questionId: string; prompt: string; review: string }[];
    totalXp?: number;
  } | null>(null);
  const [breakthroughCelebration, setBreakthroughCelebration] =
    useState<BreakthroughCelebration | null>(null);
  const [sessionBreakthrough, setSessionBreakthrough] = useState<SessionBreakthroughLine[]>([]);
  const [activeSubject, setActiveSubject] = useState("");

  const telemetry = useBiometricTelemetry(phase === "run");
  const telemetryRef = useRef(telemetry);
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  useEffect(() => {
    if (phase === "run") void warmKatex();
  }, [phase]);

  const timeLeftRef = useRef(timeLimitSec);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onboardingCompleteRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const buildFinalizeOptions = useCallback(
    (timedOut = false) => {
      const base = timedOut ? { timedOut: true as const } : {};
      if (!isApCalculusAbSubject(activeSubject)) return base;
      const snapshot = telemetryRef.current;
      return {
        ...base,
        telemetry: {
          keystrokeVariance: snapshot.keystrokeVariance,
          tabFocusLeaks: snapshot.tabFocusLeaks,
          frictionScore: snapshot.frictionScore,
          isAnomalyDetected: snapshot.isAnomalyDetected,
        },
      };
    },
    [activeSubject],
  );

  const completeOnboardingQuest = useCallback(() => {
    if (onboardingCompleteRef.current) return;
    onboardingCompleteRef.current = true;
    trackClientEvent("onboarding_quest_completed");
    router.push("/student?celebration=wanderer");
  }, [router]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadQuestion = useCallback(
    async (id: string, idx: number) => {
      const q = await getPracticeQuestionPublic(id, idx);
      if (q && "error" in q) {
        setErr(q.error);
        return;
      }
      setQuestion(q);
      setMcqPicked(null);
      setMcqResult(null);
      setWritten("");
      setWrittenFeedback(null);
      setWrittenAwaitingContinue(false);
    },
    [],
  );

  const startQuestTimer = useCallback(
    (limitSec: number, activeQuestId: string) => {
      setTimeLimitSec(limitSec);
      timeLeftRef.current = limitSec;
      setTimeLeft(limitSec);
      stopTimer();
      timerRef.current = setInterval(() => {
        timeLeftRef.current -= 1;
        setTimeLeft((t) => Math.max(0, t - 1));
        if (timeLeftRef.current <= 0) {
          stopTimer();
          void (async () => {
            const fin = await finalizePracticeQuest(activeQuestId, buildFinalizeOptions(true));
            if (fin.success) {
              setDoneResult(fin.result);
              if (fin.breakthrough) setBreakthroughCelebration(fin.breakthrough);
              setSessionBreakthrough(fin.sessionBreakthrough ?? []);
              if (onboardingMode) {
                completeOnboardingQuest();
              } else {
                setPhase("done");
              }
            }
          })();
        }
      }, 1000);
    },
    [buildFinalizeOptions, completeOnboardingQuest, onboardingMode, stopTimer],
  );

  const resumeQuestRun = useCallback(
    async (activeQuestId: string, limitSec = 15 * 60) => {
      setErr(null);
      setQIndex(0);
      const st = await startPracticeSession(activeQuestId);
      if (!st.success) {
        setErr(st.error);
        return false;
      }
      setPhase("run");
      await loadQuestion(activeQuestId, 0);
      startQuestTimer(limitSec, activeQuestId);
      return true;
    },
    [loadQuestion, startQuestTimer],
  );

  const beginPack = async () => {
    setErr(null);
    const picked = subjectOptions.find((o) => o.key === subjectKey);
    const subj =
      customSubject.trim() ||
      (picked ? picked.name.replace(/\s+Division$/i, "").trim() || picked.key : "General");
    if (subj.length < 2) {
      setErr("Choose or enter a subject.");
      return;
    }
    setBusy(true);
    setActiveSubject(subj);
    const res = await createPracticeQuest({
      subject: subj,
      difficulty: onboardingMode ? "intermediate" : difficulty,
      packType: onboardingMode ? "mcq" : packType,
      questionCount: onboardingMode ? 5 : undefined,
    });
    setBusy(false);
    if (!res.success) {
      setErr(res.error);
      return;
    }
    setQuestId(res.questId);
    setTimeLimitSec(res.timeLimitSec);
    timeLeftRef.current = res.timeLimitSec;
    setTimeLeft(res.timeLimitSec);
    setQIndex(0);
    const st = await startPracticeSession(res.questId);
    if (!st.success) {
      setErr(st.error);
      return;
    }
    setPhase("run");
    await loadQuestion(res.questId, 0);
    startQuestTimer(res.timeLimitSec, res.questId);
  };

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    if (!onboardingMode || phase !== "done" || !doneResult) return;
    completeOnboardingQuest();
  }, [onboardingMode, phase, doneResult, completeOnboardingQuest]);

  const finishRun = async (id: string) => {
    stopTimer();
    const fin = await finalizePracticeQuest(id, buildFinalizeOptions());
      if (fin.success) {
      setDoneResult(fin.result);
      if (fin.breakthrough) setBreakthroughCelebration(fin.breakthrough);
      setSessionBreakthrough(fin.sessionBreakthrough ?? []);
      const xpTotal = (fin.result.xpAwarded ?? 0) + (fin.result.perfectBonus ?? 0);
      if (xpTotal > 0) {
        emitXpAward({
          amount: xpTotal,
          totalXp: fin.result.totalXp ?? 0,
          trigger: "quest",
          message: fin.result.perfect ? "Perfect score bonus!" : undefined,
        });
      }
      if (onboardingMode) {
        completeOnboardingQuest();
      } else {
        setPhase("done");
      }
    } else {
      setErr(fin.error);
    }
  };

  const onStartNextBreakthroughQuest = async () => {
    if (!breakthroughCelebration) return;
    setBusy(true);
    const res = await createNextBreakthroughQuest(breakthroughCelebration.eventId);
    setBusy(false);
    if (!res.success) {
      setErr(res.error);
      setBreakthroughCelebration(null);
      return;
    }
    setBreakthroughCelebration(null);
    setSessionBreakthrough([]);
    setDoneResult(null);
    setQuestId(res.questId);
    await resumeQuestRun(res.questId);
  };

  const onMcqSelect = async (optIdx: number) => {
    if (!questId || !question || question.kind !== "mcq" || mcqResult) return;
    setMcqPicked(optIdx);
    setBusy(true);
    const r = await submitPracticeMcq(questId, qIndex, optIdx);
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    setMcqResult({
      correct: r.correct,
      explanation: r.explanation,
      correctIndex: r.correctIndex,
      canContinue: !r.finished,
    });
    if (r.correct && !r.finished) {
      setCorrectCelebration({ explanation: r.explanation, mode: "mcq" });
    }
    if (r.finished && questId) {
      await finishRun(questId);
    }
  };

  const onWrittenSubmit = async () => {
    if (!questId || !question || question.kind === "mcq" || !written.trim()) return;
    setBusy(true);
    const r = await submitPracticeWritten(questId, qIndex, written);
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    setWrittenFeedback(r.feedback + (r.explanation ? `\n\n${r.explanation}` : ""));
    if (r.finished && questId) {
      await finishRun(questId);
    } else if (r.correct) {
      setCorrectCelebration({
        explanation: r.explanation || r.feedback,
        mode: "written",
      });
      setWrittenAwaitingContinue(true);
    } else {
      setWrittenAwaitingContinue(true);
    }
  };

  const writtenContinue = async () => {
    if (!questId) return;
    setCorrectCelebration(null);
    setWrittenAwaitingContinue(false);
    const next = qIndex + 1;
    setQIndex(next);
    await loadQuestion(questId, next);
  };

  const mcqNext = async () => {
    if (!questId) return;
    setCorrectCelebration(null);
    setMcqResult(null);
    setMcqPicked(null);
    const next = qIndex + 1;
    setQIndex(next);
    await loadQuestion(questId, next);
  };

  const goPrevQuestion = async () => {
    if (!questId || busy || qIndex <= 0) return;
    setMcqResult(null);
    setMcqPicked(null);
    setCorrectCelebration(null);
    setWrittenFeedback(null);
    setWrittenAwaitingContinue(false);
    setWritten("");
    const prev = qIndex - 1;
    setQIndex(prev);
    await loadQuestion(questId, prev);
  };

  const goNextBySwipe = async () => {
    if (!questId || busy) return;
    if (question?.kind === "mcq" && mcqResult?.canContinue) {
      await mcqNext();
    } else if (writtenAwaitingContinue) {
      await writtenContinue();
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (phase === "wizard") {
    return (
      <div className="relative mx-auto max-w-xl px-4 py-10">
        {busy ? (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm"
            aria-busy="true"
            aria-live="polite"
          >
            <div
              className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent motion-reduce:animate-none motion-reduce:border-indigo-400"
              aria-hidden
            />
            <p className={`mt-4 text-sm font-semibold ${mentrixStudent.textOnLight}`}>Building your pack…</p>
            <p className={`mt-1 max-w-[14rem] text-center text-xs ${mentrixStudent.textMutedOnLight}`}>
              AI may take a few seconds — hang tight.
            </p>
          </div>
        ) : null}
        {!onboardingMode ? (
          <div className="mb-6">
            <BackButton />
          </div>
        ) : null}
        <div className={`${mentrixStudent.card} p-6 sm:p-8`}>
        <p className={mentrixStudent.sectionEyebrowOnLight}>
          {onboardingMode ? "First quest" : "Practice packs"}
        </p>
        <h1 className={`mt-2 text-2xl font-bold ${mentrixStudent.textOnLight}`}>
          {onboardingMode ? "Pick your subject" : "New quest"}
        </h1>
        <p className={`mt-2 text-sm leading-relaxed ${mentrixStudent.textMutedOnLight}`}>
          {onboardingMode
            ? "Five quick questions. Your rank starts here."
            : "Short drills built for where you are right now. Get instant feedback, track your progress, and earn XP as you go."}
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className={`text-xs font-medium ${mentrixStudent.textMutedOnLight}`}>Subject</label>
            <DivisionFocusSelect
              value={subjectKey}
              onValueChange={(v) => {
                if (v) setSubjectKey(v);
              }}
              divisions={subjectOptions}
              showNoneOption={false}
              triggerClassName="mt-1"
            />
            {!onboardingMode && (
              <Input
                className="mt-2 border-violet-200 bg-white text-zinc-950 placeholder:text-zinc-500"
                placeholder="Or type a custom subject…"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            )}
          </div>

          {!onboardingMode && (
            <div>
              <label className={`text-xs font-medium ${mentrixStudent.textMutedOnLight}`}>Difficulty</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      difficulty === d.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-950"
                        : "border-violet-200 bg-white text-zinc-700"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!onboardingMode && (
            <div>
              <label className={`text-xs font-medium ${mentrixStudent.textMutedOnLight}`}>Question type</label>
              <div className="mt-2 grid gap-2">
                {PACK_TYPES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPackType(p.value)}
                    className={`text-left rounded-xl border p-3 text-sm ${
                      packType === p.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-violet-200 bg-white"
                    }`}
                  >
                    <span className={`font-semibold ${mentrixStudent.textOnLight}`}>{p.label}</span>
                    <span className={`mt-0.5 block text-xs ${mentrixStudent.textMutedOnLight}`}>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {err && <p className="text-sm font-medium text-red-700">{err}</p>}

          <Button className="w-full" variant="workbenchPrimary" disabled={busy} onClick={() => void beginPack()}>
            {busy ? "Generating…" : onboardingMode ? "Start your first quest" : "Generate quest"}
          </Button>
        </div>
        </div>
      </div>
    );
  }

  if (phase === "done" && doneResult) {
    const xpTotal = (doneResult.xpAwarded ?? 0) + (doneResult.perfectBonus ?? 0);
    return (
      <>
        <div className={`${mentrixStudent.card} mx-auto max-w-lg px-6 py-10 text-center`}>
          <h2 className={`text-2xl font-bold ${mentrixStudent.textOnLight}`}>Quest complete</h2>
          <p className="mt-4 text-4xl font-mono font-bold text-indigo-600">
            {doneResult.correct}/{doneResult.total}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {doneResult.perfect ? "Perfect score — bonus XP included." : "Nice work keep practicing."}
          </p>
          {doneResult.mistakeReviews && doneResult.mistakeReviews.length > 0 && (
            <div className="mt-8 text-left border border-slate-200 rounded-lg p-4 bg-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Review mistakes
              </p>
              <ul className="space-y-4">
                {doneResult.mistakeReviews.map((m) => (
                  <li key={m.questionId}>
                    <p className="text-xs text-slate-500 line-clamp-2">{m.prompt}</p>
                    <p className="text-sm text-slate-800 mt-1">{m.review}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sessionBreakthrough.length > 0 ? (
            <SessionBreakthroughCard lines={sessionBreakthrough} />
          ) : null}
          <div className="mt-8 flex flex-col items-center gap-3">
            <ShareScoreCardButton
              title="Quest score"
              scoreLine={`Score ${doneResult.correct}/${doneResult.total}`}
              xpLine={`+${xpTotal} XP`}
            />
            <Button
              variant="outline"
              onClick={() => {
                setPhase("wizard");
                setQuestId(null);
                setDoneResult(null);
                setBreakthroughCelebration(null);
                setSessionBreakthrough([]);
                setErr(null);
              }}
            >
              New quest
            </Button>
          </div>
        </div>
        {breakthroughCelebration ? (
          <BreakthroughCelebrationOverlay
            celebration={breakthroughCelebration}
            onDismiss={() => setBreakthroughCelebration(null)}
            onStartNextQuest={() => void onStartNextBreakthroughQuest()}
          />
        ) : null}
      </>
    );
  }

  if (phase === "run" && question) {
    const progress = ((qIndex + 1) / question.total) * 100;
    return (
      <div
        className={`${mentrixStudent.card} mx-auto max-w-3xl touch-pan-y px-4 py-6 sm:p-8`}
        onTouchStart={(e) => {
          touchStartX.current = e.targetTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) < 56) return;
          if (dx < 0) void goNextBySwipe();
          else void goPrevQuestion();
        }}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className={`text-xs font-mono ${mentrixStudent.textMutedOnLight}`}>
            Q{qIndex + 1}/{question.total}
          </p>
          <p
            className={`text-sm font-mono font-semibold ${
              timeLeft < 120 ? "text-red-600" : mentrixStudent.textOnLight
            }`}
          >
            {formatTime(timeLeft)}
          </p>
        </div>
        <div className="h-2 rounded-full bg-violet-100 overflow-hidden mb-8">
          <motion.div
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {question.kind === "mcq" ? (
              <PromptWithMath text={question.prompt} />
            ) : question.kind === "problem_solving" ? (
              <PromptWithMath text={question.prompt} />
            ) : (
              <p className={`${mentrixStudent.textOnLight} whitespace-pre-wrap text-sm leading-relaxed`}>
                {question.prompt}
              </p>
            )}

            {question.kind === "mcq" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {question.options.map((opt, i) => {
                  let cls =
                    "border border-violet-200 bg-white rounded-xl p-4 text-left text-sm transition-all hover:border-indigo-300";
                  if (mcqResult) {
                    if (i === mcqResult.correctIndex) cls += " border-emerald-500 bg-emerald-50";
                    else if (i === mcqPicked && !mcqResult.correct)
                      cls += " border-red-400 bg-red-50";
                  } else if (mcqPicked === i) cls += " ring-2 ring-indigo-400";
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      disabled={!!mcqResult || busy}
                      onClick={() => void onMcqSelect(i)}
                      whileTap={{ scale: 0.98 }}
                      className={`${cls} ${mentrixStudent.textOnLight}`}
                    >
                      <PromptWithMath text={opt} />
                    </motion.button>
                  );
                })}
              </div>
            )}

            {question.kind !== "mcq" && (
              <div className="space-y-3">
                <textarea
                  className={`w-full min-h-[120px] rounded-lg border border-violet-200 bg-white p-3 text-sm ${mentrixStudent.textOnLight}`}
                  placeholder="Your answer…"
                  value={written}
                  onChange={(e) => setWritten(e.target.value)}
                  disabled={busy || writtenAwaitingContinue}
                />
                {writtenFeedback && !correctCelebration && (
                  <p className={`text-sm whitespace-pre-wrap ${mentrixStudent.textMutedOnLight}`}>
                    {writtenFeedback}
                  </p>
                )}
                {writtenAwaitingContinue && !correctCelebration ? (
                  <Button type="button" onClick={() => void writtenContinue()}>
                    Next question
                  </Button>
                ) : !writtenAwaitingContinue ? (
                  <Button
                    disabled={busy || !written.trim()}
                    onClick={() => void onWrittenSubmit()}
                  >
                    Submit answer
                  </Button>
                ) : null}
              </div>
            )}

            {question.kind === "mcq" && mcqResult && !mcqResult.correct && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm mx-surface-light">
                <p className={`font-semibold mb-1 ${mentrixStudent.textOnLight}`}>Not quite</p>
                <p className={mentrixStudent.textMutedOnLight}>{mcqResult.explanation}</p>
                {mcqResult.canContinue && !busy && (
                  <Button
                    className="mt-4 border-indigo-300 bg-white text-indigo-950 hover:bg-indigo-50"
                    variant="outline"
                    onClick={() => void mcqNext()}
                  >
                    Next question
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <PracticeCorrectCelebration
          open={correctCelebration != null}
          explanation={correctCelebration?.explanation ?? ""}
          lite={tier === "lite"}
          onNext={() => {
            if (correctCelebration?.mode === "mcq") void mcqNext();
            else void writtenContinue();
          }}
        />

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      </div>
    );
  }

  return null;
}
