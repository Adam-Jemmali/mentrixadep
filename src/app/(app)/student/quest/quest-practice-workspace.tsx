"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { BackButton } from "@/shared/ui/back-button";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
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
import type { PracticeDifficulty } from "@/features/quest/practice-quest-types";
import { mentrixStudent, mentrixProfileType, mentrixBrandUi } from "@/features/student-profile/mentrix-student-ui";
import { BreakthroughCelebrationOverlay } from "@/features/breakthrough-events/breakthrough-overlay";
import { createNextBreakthroughQuest } from "@/features/breakthrough-events/adaptive-quests";
import type { BreakthroughCelebration } from "@/features/breakthrough-events/types";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { PracticeCorrectCelebration } from "@/features/quest/ui/practice-correct-celebration";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";
import { getMasteryGridForCurrentUser } from "@/features/mastery-grid/load-mastery-grid";
import { QuestMasteryDonePanel } from "@/features/mastery-grid/quest-mastery-done-panel";
import type { MasteryGridData, QuestMasteryHighlight } from "@/features/mastery-grid/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import {
  OnboardingQuestProgressBar,
  QuestSessionProgressBar,
} from "@/shared/ui/progress-bar-patterns";
import { QuestPackLoadPendingPanel } from "@/shared/ui/spinner-patterns";
import { QuestTimerProgressCircle } from "@/shared/ui/progress-circle-patterns";
import { ExamStakesLabel } from "@/shared/ui/tooltip-patterns";
import { ApCalcSkillGlyph } from "@/features/quest/ui/ap-calc-skill-glyph";
import {
  PracticeWrongAnswerAlert,
  isPracticeLockedAttemptError,
  PracticeLockedAttemptAlert,
} from "@/shared/ui/alert-patterns";
import {
  ExamStakesDisclosure,
  VerifiedFirstAttemptDisclosure,
} from "@/shared/ui/disclosure-patterns";
import { QuestPracticeToolsDrawer } from "@/features/quest/ui/quest-practice-tools-drawer";

const DIFFICULTIES: { value: PracticeDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

type Phase = "wizard" | "run" | "done";

export function QuestPracticeWorkspace({
  subjectOptions: _subjectOptions,
  onboardingMode = false,
}: {
  subjectOptions: { key: string; name: string }[];
  onboardingMode?: boolean;
}) {
  const router = useRouter();
  const tier = useUiPerfTier();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("intermediate");
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
    rankVerdict?: string;
    rankNextAction?: string;
    newVerifiedSkills?: number;
    mistakeReviews?: { questionId: string; prompt: string; review: string }[];
    totalXp?: number;
    streakDays?: number;
    masteryGrid?: MasteryGridData;
    masteryHighlight?: QuestMasteryHighlight;
    questVerdict?: Verdict;
  } | null>(null);
  const [lockedQuestionIndices, setLockedQuestionIndices] = useState<Set<number>>(new Set());
  const [breakthroughCelebration, setBreakthroughCelebration] =
    useState<BreakthroughCelebration | null>(null);
  const [fallbackMasteryGrid, setFallbackMasteryGrid] = useState<MasteryGridData | null>(null);

  useEffect(() => {
    if (phase === "run") void warmKatex();
  }, [phase]);

  const timeLeftRef = useRef(timeLimitSec);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onboardingCompleteRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const buildFinalizeOptions = useCallback((timedOut = false) => {
    return timedOut ? { timedOut: true as const } : {};
  }, []);

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
    setLockedQuestionIndices(new Set());
    setBusy(true);
    const res = await createPracticeQuest({
      subject: AP_CALC_AB_SUBJECT,
      difficulty: onboardingMode ? "intermediate" : difficulty,
      packType: "mcq",
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

  useEffect(() => {
    if (phase !== "done" || doneResult?.masteryGrid) {
      setFallbackMasteryGrid(null);
      return;
    }
    let cancelled = false;
    void getMasteryGridForCurrentUser()
      .then((data) => {
        if (!cancelled) setFallbackMasteryGrid(data);
      })
      .catch(() => {
        if (!cancelled) setFallbackMasteryGrid(null);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, doneResult?.masteryGrid]);

  const finishRun = async (id: string) => {
    stopTimer();
    const fin = await finalizePracticeQuest(id, buildFinalizeOptions());
      if (fin.success) {
      setDoneResult(fin.result);
      if (fin.breakthrough) setBreakthroughCelebration(fin.breakthrough);
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
    setLockedQuestionIndices((prev) => new Set(prev).add(qIndex));
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
    const prev = qIndex - 1;
    if (lockedQuestionIndices.has(prev)) return;
    setMcqResult(null);
    setMcqPicked(null);
    setCorrectCelebration(null);
    setWrittenFeedback(null);
    setWrittenAwaitingContinue(false);
    setWritten("");
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

  if (phase === "wizard") {
    return (
      <div className="relative mx-auto max-w-xl px-4 py-10">
        {busy ? (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[#0B1220]/92 px-8 backdrop-blur-sm"
            aria-busy="true"
            aria-live="polite"
          >
            <QuestPackLoadPendingPanel className="max-w-xs" />
          </div>
        ) : null}
        {!onboardingMode ? (
          <div className="mb-6">
            <BackButton />
          </div>
        ) : null}
        <div className={`${mentrixStudent.card} p-6 sm:p-8`}>
        <p className={mentrixStudent.sectionEyebrow}>
          {onboardingMode ? "First quest" : "Practice packs"}
        </p>
        <h1 className={`mt-2 ${mentrixProfileType.cardTitleOnDark}`}>
          {onboardingMode ? "Your first verified skills" : "Verified practice pack"}
        </h1>
        <p className={`mt-2 text-sm leading-relaxed ${mentrixStudent.textMutedOnDark}`}>
          {onboardingMode
            ? "Five first attempts from the AP Calculus AB item bank. Each answer is permanent."
            : null}
        </p>

        {!onboardingMode ? (
          <div className="mt-4">
            <VerifiedFirstAttemptDisclosure subjectLabel={AP_CALC_AB_SUBJECT} tone="dark" />
          </div>
        ) : null}

        {onboardingMode ? (
          <div className="mt-6">
            <OnboardingQuestProgressBar phase="wizard" />
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          <div>
            <label className={`text-xs font-medium ${mentrixStudent.textMutedOnDark}`}>Subject</label>
            <p className={`mt-2 rounded-xl border border-violet-500/35 bg-indigo-950/55 px-4 py-3 text-sm font-semibold text-violet-50`}>
              {AP_CALC_AB_SUBJECT}
            </p>
          </div>

          {!onboardingMode && (
            <div>
              <label className={`text-xs font-medium ${mentrixStudent.textMutedOnDark}`}>Difficulty</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={
                      difficulty === d.value ? mentrixBrandUi.chipActive : mentrixBrandUi.chipIdle
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {err ? (
            isPracticeLockedAttemptError(err) ? (
              <PracticeLockedAttemptAlert />
            ) : (
              <p className="text-sm font-medium text-red-300">{err}</p>
            )
          ) : null}

          <Button className="w-full" variant="workbenchPrimary" disabled={busy} onClick={() => void beginPack()}>
            {busy ? "Loading pack…" : onboardingMode ? "Start your first quest" : "Start verified pack"}
          </Button>
        </div>
        </div>
      </div>
    );
  }

  if (phase === "done" && doneResult) {
    const grid = doneResult.masteryGrid ?? fallbackMasteryGrid;
    const highlight = doneResult.masteryHighlight;
    const verdict = doneResult.questVerdict;

    return (
      <>
        {onboardingMode ? (
          <div className="mx-auto max-w-3xl px-4 pt-4">
            <OnboardingQuestProgressBar phase="done" />
          </div>
        ) : null}
        {grid && verdict ? (
          <QuestMasteryDonePanel
            grid={grid}
            verdict={verdict}
            highlightTransition={
              highlight && !highlight.unchanged
                ? {
                    nodeId: highlight.nodeId,
                    fromState: highlight.fromState,
                    toState: highlight.toState,
                  }
                : undefined
            }
            correct={doneResult.correct}
            total={doneResult.total}
            xpAwarded={doneResult.xpAwarded}
            perfectBonus={doneResult.perfectBonus}
            streakDays={doneResult.streakDays}
            onNewPack={() => {
              setPhase("wizard");
              setQuestId(null);
              setDoneResult(null);
              setFallbackMasteryGrid(null);
              setBreakthroughCelebration(null);
              setLockedQuestionIndices(new Set());
              setErr(null);
            }}
          />
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <div className={`${mentrixStudent.cardArena} p-8 text-center`}>
              <div
                className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent motion-reduce:animate-none"
                aria-hidden
              />
              <p className={`mt-4 text-sm ${mentrixStudent.textMutedOnDark}`}>
                Updating your mastery map…
              </p>
            </div>
          </div>
        )}
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
    return (
      <>
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
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className={`text-xs font-mono ${mentrixStudent.textMutedOnLight}`}>
            Q{qIndex + 1}/{question.total}
          </p>
          <QuestTimerProgressCircle
            timeLeftSec={timeLeft}
            timeLimitSec={timeLimitSec}
          />
        </div>
        <div className="mb-8">
          {onboardingMode ? (
            <OnboardingQuestProgressBar
              phase="run"
              questionIndex={qIndex}
              questionTotal={question.total}
            />
          ) : (
            <QuestSessionProgressBar value={((qIndex + 1) / question.total) * 100} />
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {(question.examStakes || question.subtopicTag) && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {question.subtopicTag ? (
                    <div className="flex items-center gap-2.5">
                      <ApCalcSkillGlyph nodeName={question.subtopicTag} size="sm" />
                      <span className="text-xs font-semibold text-slate-700">{question.subtopicTag}</span>
                    </div>
                  ) : null}
                  {question.examStakes ? (
                    <ExamStakesLabel examStakes={question.examStakes} tone="light" />
                  ) : null}
                </div>
                {question.examStakes ? (
                  <ExamStakesDisclosure examStakes={question.examStakes} />
                ) : null}
              </div>
            )}

            {question.kind === "mcq" ? (
              <PromptWithMath text={question.prompt} variant="dark" />
            ) : question.kind === "problem_solving" ? (
              <PromptWithMath text={question.prompt} variant="dark" />
            ) : (
              <p className={`${mentrixStudent.textOnLight} whitespace-pre-wrap text-sm leading-relaxed`}>
                {question.prompt}
              </p>
            )}

            {question.kind === "mcq" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {question.options.map((opt, i) => {
                  const base =
                    "rounded-xl border p-4 text-left text-sm transition-all";
                  let cls = `${base} border-violet-500/35 bg-indigo-950/50 text-violet-50 hover:border-violet-400/50`;
                  if (mcqResult) {
                    if (i === mcqResult.correctIndex) {
                      cls = `${base} border-emerald-400/70 bg-emerald-950/55 text-emerald-100 ring-1 ring-emerald-400/35`;
                    } else if (i === mcqPicked && !mcqResult.correct) {
                      cls = `${base} border-red-400/70 bg-red-950/55 text-red-100 ring-1 ring-red-400/35`;
                    } else {
                      cls = `${base} border-indigo-500/25 bg-indigo-950/35 text-violet-200/70 opacity-80`;
                    }
                  } else if (mcqPicked === i) {
                    cls = `${base} border-violet-400/70 bg-violet-950/65 text-white ring-2 ring-violet-400/60`;
                  }
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      disabled={!!mcqResult || busy}
                      onClick={() => void onMcqSelect(i)}
                      whileTap={{ scale: 0.98 }}
                      className={`${cls} [&_.katex]:text-inherit`}
                    >
                      <PromptWithMath text={opt} variant="dark" />
                    </motion.button>
                  );
                })}
              </div>
            )}

            {question.kind !== "mcq" && (
              <div className="space-y-3">
                <textarea
                  className={`w-full min-h-[120px] rounded-lg border border-violet-500/35 bg-[#0B1220]/70 p-3 text-sm text-violet-50 placeholder:text-violet-300/45`}
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
              <PracticeWrongAnswerAlert
                explanation={mcqResult.explanation}
                onContinue={mcqResult.canContinue && !busy ? () => void mcqNext() : undefined}
                busy={busy}
                className="mx-panel-brand"
              />
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

        {err ? (
          <div className="mt-4">
            {isPracticeLockedAttemptError(err) ? (
              <PracticeLockedAttemptAlert />
            ) : (
              <p className="text-sm text-red-600">{err}</p>
            )}
          </div>
        ) : null}
      </div>
      <QuestPracticeToolsDrawer
        questionIndex={qIndex}
        questionTotal={question.total}
        timeLeftSec={timeLeft}
        timeLimitSec={timeLimitSec}
        subtopicTag={question.subtopicTag}
        examStakes={question.examStakes}
      />
      </>
    );
  }

  return null;
}
