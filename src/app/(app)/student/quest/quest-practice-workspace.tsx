"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { QuestStimulusBlock } from "@/features/quest/components/quest-stimulus-block";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import {
  createPracticeQuest,
  startPracticeSession,
  getPracticeQuestionPublic,
  submitPracticeMcq,
  submitPracticeWritten,
  submitPracticeFreeResponse,
  submitPracticeCompleteExpression,
  submitPracticeDragOrder,
  submitPracticeGraphFeature,
  submitPracticeMultiPart,
  finalizePracticeQuest,
  type PracticeQuestionPublic,
} from "@/features/quest/practice-quest";
import { MultiPartQuestion } from "@/features/quest/components/multi-part-question";
import { MathInput } from "@/features/quest/components/math-input";
import { CompleteExpressionQuestion } from "@/features/quest/components/complete-expression-question";
import { DragOrderQuestion } from "@/features/quest/components/drag-order-question";
import { GraphFeatureQuestion } from "@/features/quest/components/graph-feature-question";
import { emitXpAward } from "@/features/xp/xp-events";
import { trackClientEvent } from "@/shared/integrations/use-track";
import type { PracticeDifficulty } from "@/features/quest/practice-quest-types";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { QuestAnimatedSticky, useQuestRunEntry } from "@/features/quest/ui/quest-animated-sticky";
import { QuestMcqOptions } from "@/features/quest/ui/quest-mcq-options";
import { QuestQuestionStage } from "@/features/quest/ui/quest-question-stage";
import { QuestRunChrome, QuestRunLoadingState } from "@/features/quest/ui/quest-run-chrome";
import type { MasteryNodeVisualState } from "@/components/mastery-node";
import { BreakthroughCelebrationOverlay } from "@/features/breakthrough-events/breakthrough-overlay";
import { createNextBreakthroughQuest } from "@/features/breakthrough-events/adaptive-quests";
import type { BreakthroughCelebration } from "@/features/breakthrough-events/types";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { PracticeCorrectCelebration } from "@/features/quest/ui/practice-correct-celebration";
import { StepFeedback } from "@/features/quest/components/step-feedback";
import type { SolutionStep, StepFeedbackPartial } from "@/features/quest/components/step-feedback-pure";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";
import { getMasteryGridForCurrentUser } from "@/features/mastery-grid/get-mastery-grid-action";
import { patchMasteryGridCache } from "@/features/mastery-grid/use-mastery-grid-cache";
import { QuestDoneScreen } from "@/features/quest/ui/quest-done-screen";
import { parseQuestPromptParam } from "@/features/quest/quest-post-step-pure";
import type {
  MasteryGridData,
  QuestMasteryHighlight,
  QuestOpenedHighlight,
  QuestPhoenixHighlight,
  QuestFasterHighlight,
} from "@/features/mastery-grid/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import {
  OnboardingQuestProgressBar,
} from "@/shared/ui/progress-bar-patterns";
import { QuestPackLoadPendingPanel } from "@/shared/ui/spinner-patterns";
import { ApCalcSkillGlyph } from "@/features/quest/ui/ap-calc-skill-glyph";
import {
  PracticeWrongAnswerAlert,
  isPracticeLockedAttemptError,
  PracticeLockedAttemptAlert,
} from "@/shared/ui/alert-patterns";
import {
  ExamStakesDisclosure,
} from "@/shared/ui/disclosure-patterns";
import { QuestPracticeToolsDrawer } from "@/features/quest/ui/quest-practice-tools-drawer";
import { QuestPracticePackWizard } from "@/features/quest/ui/quest-practice-pack-wizard";
import { MentrixaVocabIcon, VocabSectionHeading, VOCAB_HEADING_ICON_SIZE } from "@/shared/icons/mentrixa-vocab-icons";

type Phase = "wizard" | "run" | "done";

export function QuestPracticeWorkspace({
  subjectOptions: _subjectOptions,
  onboardingMode = false,
}: {
  subjectOptions: { key: string; name: string }[];
  onboardingMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusNodeName = useMemo(
    () => parseQuestPromptParam(searchParams.get("prompt") ?? ""),
    [searchParams],
  );
  const packIdFromUrl = searchParams.get("packId");
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
    studentAnswer: string;
    correctAnswer: string;
    solutionSteps: SolutionStep[];
    partialCredit: StepFeedbackPartial | null;
    hasStepTrace: boolean;
  } | null>(null);
  const [writtenFeedback, setWrittenFeedback] = useState<string | null>(null);
  const [writtenAwaitingContinue, setWrittenAwaitingContinue] = useState(false);
  const [correctCelebration, setCorrectCelebration] = useState<{
    explanation: string;
    mode: "mcq" | "written";
    solutionSteps?: SolutionStep[];
    correctAnswer?: string;
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
    openedHighlight?: QuestOpenedHighlight;
    phoenixHighlight?: QuestPhoenixHighlight;
    fasterHighlight?: QuestFasterHighlight;
    questVerdict?: Verdict;
    packSkillNodeIds?: string[];
  } | null>(null);
  const [lockedQuestionIndices, setLockedQuestionIndices] = useState<Set<number>>(new Set());
  const [breakthroughCelebration, setBreakthroughCelebration] =
    useState<BreakthroughCelebration | null>(null);
  const [fallbackMasteryGrid, setFallbackMasteryGrid] = useState<MasteryGridData | null>(null);

  const [questionLoading, setQuestionLoading] = useState(false);

  useEffect(() => {
    if (phase === "run") void warmKatex();
  }, [phase]);

  const timeLeftRef = useRef(timeLimitSec);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onboardingCompleteRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const questionShownAtRef = useRef<number | null>(null);

  useQuestRunEntry(phase === "run", `${questId ?? "idle"}-${qIndex}-${question?.id ?? "loading"}`);

  const questNodeVisualState = useMemo((): MasteryNodeVisualState | undefined => {
    if (mcqResult?.correct || correctCelebration) return "verified";
    if (mcqResult && !mcqResult.correct) return "attempted";
    if (writtenAwaitingContinue && writtenFeedback) return "attempted";
    return "practiced";
  }, [correctCelebration, mcqResult, writtenAwaitingContinue, writtenFeedback]);

  const takeAnsweredMs = useCallback(() => {
    const started = questionShownAtRef.current;
    questionShownAtRef.current = null;
    if (started == null) return null;
    return Math.max(0, Date.now() - started);
  }, []);

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

  const resetQuestionLocalState = useCallback(() => {
    setMcqPicked(null);
    setMcqResult(null);
    setWritten("");
    setWrittenFeedback(null);
    setWrittenAwaitingContinue(false);
    setCorrectCelebration(null);
    setErr(null);
  }, []);

  const loadQuestion = useCallback(
    async (id: string, idx: number): Promise<boolean> => {
      setQuestionLoading(true);
      try {
        const q = await getPracticeQuestionPublic(id, idx);
        if (q && "error" in q) {
          setErr(q.error);
          return false;
        }
        if (!q || typeof q !== "object" || !("kind" in q) || !("prompt" in q)) {
          setErr("Question not found.");
          return false;
        }
        setQuestion(q);
        resetQuestionLocalState();
        setQIndex(idx);
        questionShownAtRef.current = Date.now();
        return true;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load the next question.");
        return false;
      } finally {
        setQuestionLoading(false);
      }
    },
    [resetQuestionLocalState],
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
              if (fin.result.masteryGrid) {
                patchMasteryGridCache(fin.result.masteryGrid);
              }
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

  useEffect(() => {
    if (!packIdFromUrl || onboardingMode || phase !== "wizard") return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      const ok = await resumeQuestRun(packIdFromUrl);
      if (!cancelled) {
        setBusy(false);
        if (ok) {
          setQuestId(packIdFromUrl);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onboardingMode, packIdFromUrl, phase, resumeQuestRun]);

  const beginPack = async () => {
    setErr(null);
    setLockedQuestionIndices(new Set());
    setBusy(true);
    const res = await createPracticeQuest({
      subject: AP_CALC_AB_SUBJECT,
      difficulty: onboardingMode ? "intermediate" : difficulty,
      packType: "mcq",
      questionCount: onboardingMode ? 5 : undefined,
      focusNodeName: focusNodeName ?? undefined,
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

  const queuePracticeForNode = async (nodeName: string) => {
    setErr(null);
    setBusy(true);
    const res = await createPracticeQuest({
      subject: AP_CALC_AB_SUBJECT,
      difficulty: onboardingMode ? "intermediate" : difficulty,
      packType: "mcq",
      focusNodeName: nodeName,
    });
    setBusy(false);
    if (!res.success) {
      setErr(res.error);
      return;
    }
    stopTimer();
    setMcqResult(null);
    setMcqPicked(null);
    setWrittenFeedback(null);
    setWrittenAwaitingContinue(false);
    setCorrectCelebration(null);
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
      if (fin.result.masteryGrid) {
        patchMasteryGridCache(fin.result.masteryGrid);
      }
      if (fin.breakthrough) setBreakthroughCelebration(fin.breakthrough);
      const xpTotal =
        (fin.result.xpAwarded ?? 0) +
        (fin.result.perfectBonus ?? 0) +
        (fin.result.phoenixHighlight?.xpAwarded ?? 0);
      if (xpTotal > 0) {
        emitXpAward({
          amount: xpTotal,
          totalXp: fin.result.totalXp ?? 0,
          trigger: "quest",
          message: fin.result.perfect
            ? "Perfect score bonus!"
            : fin.result.phoenixHighlight
              ? "Recovered."
              : undefined,
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
    const r = await submitPracticeMcq(questId, qIndex, optIdx, takeAnsweredMs());
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
      studentAnswer: r.studentAnswer,
      correctAnswer: r.correctAnswer,
      solutionSteps: r.solutionSteps,
      partialCredit: r.partialCredit,
      hasStepTrace: r.hasStepTrace,
    });
    setLockedQuestionIndices((prev) => new Set(prev).add(qIndex));
    if (r.correct && !r.finished) {
      setCorrectCelebration({
        explanation: r.explanation,
        mode: "mcq",
        solutionSteps: r.hasStepTrace ? r.solutionSteps : undefined,
        correctAnswer: r.correctAnswer,
      });
    }
    if (r.finished && questId) {
      await finishRun(questId);
    }
  };

  const onWrittenSubmit = async () => {
    if (
      !questId ||
      !question ||
      (question.kind !== "short_answer" && question.kind !== "problem_solving") ||
      !written.trim()
    ) {
      return;
    }
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

  const afterConstruction = async (
    r: { correct: boolean; explanation: string; finished: boolean; feedback?: string },
  ) => {
    setLockedQuestionIndices((prev) => new Set(prev).add(qIndex));
    setWrittenFeedback(r.feedback ?? r.explanation);
    if (r.finished && questId) {
      await finishRun(questId);
      return;
    }
    if (r.correct) {
      setCorrectCelebration({ explanation: r.explanation, mode: "written" });
    }
    setWrittenAwaitingContinue(true);
  };

  const onFreeResponseSubmit = async (value: string) => {
    if (!questId || !question || question.kind !== "free_response") return;
    setBusy(true);
    const r = await submitPracticeFreeResponse(questId, qIndex, value, takeAnsweredMs());
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    await afterConstruction(r);
  };

  const onClozeSubmit = async (answers: Record<string, string>) => {
    if (!questId || !question || question.kind !== "complete_expression") return;
    setBusy(true);
    const r = await submitPracticeCompleteExpression(questId, qIndex, answers, takeAnsweredMs());
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    await afterConstruction({
      ...r,
      feedback: `Blank accuracy ${(r.accuracyPct * 100).toFixed(0)}%.`,
    });
  };

  const onDragOrderSubmit = async (ordered: string[]) => {
    if (!questId || !question || question.kind !== "drag_order") return;
    setBusy(true);
    const r = await submitPracticeDragOrder(questId, qIndex, ordered, takeAnsweredMs());
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    await afterConstruction({
      ...r,
      feedback: r.correct ? "Correct order." : `Order accuracy ${(r.accuracyPct * 100).toFixed(0)}%.`,
    });
  };

  const onGraphFeatureSubmit = async (payload: {
    selections?: import("@/features/quest/quest-interaction-formats-pure").GraphFeatureSelection[];
    sketchControls?: import("@/features/quest/quest-interaction-formats-pure").GraphSketchSample[];
  }) => {
    if (!questId || !question || question.kind !== "graph_feature") return;
    setBusy(true);
    const r = await submitPracticeGraphFeature(questId, qIndex, {
      ...payload,
      answeredMs: takeAnsweredMs(),
    });
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    await afterConstruction({
      ...r,
      feedback: r.correct
        ? "Graph answer locked against verified ground truth."
        : `Feature accuracy ${(r.accuracyPct * 100).toFixed(0)}%.`,
    });
  };

  const writtenContinue = async () => {
    if (!questId) return;
    setCorrectCelebration(null);
    setWrittenAwaitingContinue(false);
    setBusy(true);
    await loadQuestion(questId, qIndex + 1);
    setBusy(false);
  };

  const mcqNext = async () => {
    if (!questId) return;
    setCorrectCelebration(null);
    setMcqResult(null);
    setMcqPicked(null);
    setBusy(true);
    await loadQuestion(questId, qIndex + 1);
    setBusy(false);
  };

  const onMultiPartSubmit = async (input: {
    partIndex: number;
    selectedIndex?: number;
    freeResponse?: string;
  }) => {
    if (!questId || !question || question.kind !== "multi_part") return;
    setBusy(true);
    setErr(null);
    const r = await submitPracticeMultiPart(questId, qIndex, input.partIndex, {
      selectedIndex: input.selectedIndex,
      freeResponse: input.freeResponse,
      answeredMs: takeAnsweredMs(),
    });
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    await loadQuestion(questId, qIndex);
    if (r.finishedQuestion) {
      setLockedQuestionIndices((prev) => new Set(prev).add(qIndex));
    }
    if (r.finishedPack && questId) {
      await finishRun(questId);
    }
  };

  const multiPartContinue = async () => {
    if (!questId) return;
    setBusy(true);
    await loadQuestion(questId, qIndex + 1);
    setBusy(false);
  };

  const goPrevQuestion = async () => {
    if (!questId || busy || questionLoading || qIndex <= 0) return;
    const prev = qIndex - 1;
    if (lockedQuestionIndices.has(prev)) return;
    setBusy(true);
    await loadQuestion(questId, prev);
    setBusy(false);
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
    if (onboardingMode) {
      return (
        <div className="relative w-full">
          {busy ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[#FAFAF8]/92 px-8 backdrop-blur-sm"
              aria-busy="true"
              aria-live="polite"
            >
              <QuestPackLoadPendingPanel className="max-w-xs" />
            </div>
          ) : null}
          <div className={`${mentrixStudent.card} space-y-6 p-6 sm:p-8`}>
            <VocabSectionHeading
              name="quest"
              label="First quest"
              surface="light"
              labelClassName="mx-hub-type-ui text-[#6366F1]"
              className="block w-full"
            />
            <h1 className={`flex items-center gap-4 ${mentrixStudent.cardTitle}`}>
              <MentrixaVocabIcon name="verified" size={VOCAB_HEADING_ICON_SIZE} gold surface="light" title="Verified" />
              <span>Your first verified skills</span>
            </h1>
            <p className={`mt-2 text-sm leading-relaxed ${mentrixStudent.textMutedOnDark}`}>
              Five first answers from the AP Calculus AB item bank. Each answer is permanent.
            </p>
            <div className="mt-6">
              <OnboardingQuestProgressBar phase="wizard" />
            </div>
            {err ? (
              isPracticeLockedAttemptError(err) ? (
                <PracticeLockedAttemptAlert />
              ) : (
                <p className="text-sm font-medium text-red-600">{err}</p>
              )
            ) : null}
            <Button className="w-full" variant="workbenchPrimary" disabled={busy} onClick={() => void beginPack()}>
              {busy ? "Loading pack…" : "Start your first quest"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <QuestPracticePackWizard
        busy={busy}
        err={err}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onStart={() => void beginPack()}
        focusNodeName={focusNodeName}
      />
    );
  }

  if (phase === "done" && doneResult) {
    const grid = doneResult.masteryGrid ?? fallbackMasteryGrid;

    return (
      <>
        {onboardingMode ? (
          <div className="mx-auto max-w-3xl px-4 pt-4">
            <OnboardingQuestProgressBar phase="done" />
          </div>
        ) : null}
        {grid ? (
          <QuestDoneScreen
            grid={grid}
            masteryHighlight={doneResult.masteryHighlight}
            openedHighlight={doneResult.openedHighlight}
            phoenixHighlight={doneResult.phoenixHighlight}
            fasterHighlight={doneResult.fasterHighlight}
            packSkillNodeIds={doneResult.packSkillNodeIds ?? []}
            correct={doneResult.correct}
            total={doneResult.total}
            xpAwarded={doneResult.xpAwarded}
            perfectBonus={doneResult.perfectBonus}
            newVerifiedSkills={doneResult.newVerifiedSkills ?? 0}
            onTryAgain={() => void beginPack()}
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

  if (phase === "run") {
    const total = question?.total ?? 0;
    const showPromptOutside =
      question != null &&
      question.kind !== "complete_expression" &&
      question.kind !== "drag_order" &&
      question.kind !== "graph_feature" &&
      question.kind !== "multi_part";
    const progressPercent = total > 0 ? ((qIndex + 1) / total) * 100 : 0;

    return (
      <>
        <QuestAnimatedSticky variant="taped">
          <div
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
            {onboardingMode ? (
              <div className="quest-header mb-4">
                <OnboardingQuestProgressBar
                  phase="run"
                  questionIndex={qIndex}
                  questionTotal={total || 1}
                />
              </div>
            ) : (
              <QuestRunChrome
                questionIndex={qIndex}
                questionTotal={total}
                progressPercent={progressPercent}
                timeLeftSec={timeLeft}
                timeLimitSec={timeLimitSec}
                skillNodeName={question?.subtopicTag}
                nodeVisualState={question ? questNodeVisualState : undefined}
              />
            )}

            {questionLoading || !question ? (
              <QuestRunLoadingState message="Loading next question…" error={err} />
            ) : (
              <QuestQuestionStage questionKey={question.id || String(qIndex)}>
                {(question.examStakes || question.subtopicTag) && (
                  <div className="space-y-2">
                    {question.subtopicTag ? (
                      <div className="flex items-center gap-2.5">
                        <ApCalcSkillGlyph nodeName={question.subtopicTag} size="sm" />
                        <span className="text-xs font-semibold text-white/80">{question.subtopicTag}</span>
                      </div>
                    ) : null}
                    {question.examStakes ? (
                      <ExamStakesDisclosure examStakes={question.examStakes} tone="dark" />
                    ) : null}
                  </div>
                )}

                {showPromptOutside ? (
                  <>
                    <QuestStimulusBlock stimulus={question.stimulus} variant="dark" />
                    <div className="text-[17px] leading-[1.6] text-white">
                      <PromptWithMath
                        text={question.prompt}
                        variant="dark"
                        highlightKeyTerms
                      />
                    </div>
                  </>
                ) : null}

                {question.kind === "multi_part" ? (
                  <MultiPartQuestion
                    stem={question.prompt}
                    stimulus={question.stimulus}
                    parts={question.parts}
                    partsCorrect={question.partsCorrect}
                    partsTotal={question.partsTotal}
                    xpEarned={question.xpEarned}
                    finished={question.finished}
                    busy={busy}
                    onSubmitPart={onMultiPartSubmit}
                    onContinue={
                      question.finished && !busy ? () => void multiPartContinue() : undefined
                    }
                  />
                ) : null}

                {question.kind === "mcq" ? (
                  <QuestMcqOptions
                    options={question.options}
                    picked={mcqPicked}
                    result={
                      mcqResult
                        ? { correct: mcqResult.correct, correctIndex: mcqResult.correctIndex }
                        : null
                    }
                    busy={busy}
                    onSelect={(i) => void onMcqSelect(i)}
                  />
                ) : null}

                {question.kind === "free_response" && !writtenAwaitingContinue ? (
                  <MathInput
                    itemId={question.id}
                    mode="compose"
                    surface="dark"
                    disabled={busy}
                    onComposeSubmit={onFreeResponseSubmit}
                  />
                ) : null}

                {question.kind === "complete_expression" && !writtenAwaitingContinue ? (
                  <>
                    <QuestStimulusBlock stimulus={question.stimulus} variant="dark" />
                    <CompleteExpressionQuestion
                      itemId={question.id}
                      prompt={question.prompt}
                      blankKeys={question.blankKeys}
                      busy={busy}
                      disabled={busy}
                      onSubmit={onClozeSubmit}
                    />
                  </>
                ) : null}

                {question.kind === "drag_order" && !writtenAwaitingContinue ? (
                  <>
                    <QuestStimulusBlock stimulus={question.stimulus} variant="dark" />
                    <DragOrderQuestion
                      prompt={question.prompt}
                      items={question.items}
                      busy={busy}
                      disabled={busy}
                      onSubmit={onDragOrderSubmit}
                    />
                  </>
                ) : null}

                {question.kind === "graph_feature" && !writtenAwaitingContinue ? (
                  <GraphFeatureQuestion
                    prompt={question.prompt}
                    stimulus={question.stimulus}
                    maxSelections={question.maxSelections}
                    targetKinds={question.targetKinds}
                    sketchMode={question.sketchMode}
                    sketchDomain={question.sketchDomain}
                    busy={busy}
                    disabled={busy}
                    onSubmit={onGraphFeatureSubmit}
                  />
                ) : null}

                {(question.kind === "short_answer" || question.kind === "problem_solving") && (
                  <div className="space-y-3">
                    <textarea
                      className={`${mentrixStudent.hubFieldInput} min-h-[120px] bg-[var(--mx-navy-2)] text-white placeholder:text-white/40`}
                      placeholder="Your answer…"
                      value={written}
                      onChange={(e) => setWritten(e.target.value)}
                      disabled={busy || writtenAwaitingContinue}
                    />
                    {!writtenAwaitingContinue ? (
                      <Button disabled={busy || !written.trim()} onClick={() => void onWrittenSubmit()}>
                        Submit answer
                      </Button>
                    ) : null}
                  </div>
                )}

                {writtenFeedback && !correctCelebration && writtenAwaitingContinue ? (
                  <p className="text-sm whitespace-pre-wrap text-white/75">{writtenFeedback}</p>
                ) : null}

                {writtenAwaitingContinue && !correctCelebration ? (
                  <Button type="button" onClick={() => void writtenContinue()}>
                    Next question
                  </Button>
                ) : null}

                {question.kind === "mcq" && mcqResult && !mcqResult.correct ? (
                  mcqResult.hasStepTrace ? (
                    <StepFeedback
                      outcome={mcqResult.partialCredit ? "partial" : "incorrect"}
                      studentAnswer={mcqResult.studentAnswer}
                      correctAnswer={mcqResult.correctAnswer}
                      solutionSteps={mcqResult.solutionSteps}
                      partialCredit={mcqResult.partialCredit}
                      onPracticeStep={
                        question.subtopicTag && !busy
                          ? () => void queuePracticeForNode(question.subtopicTag!)
                          : undefined
                      }
                      onContinue={
                        !question.subtopicTag && mcqResult.canContinue && !busy
                          ? () => void mcqNext()
                          : undefined
                      }
                      busy={busy}
                      surface="dark"
                    />
                  ) : (
                    <PracticeWrongAnswerAlert
                      explanation={mcqResult.explanation}
                      onContinue={
                        mcqResult.canContinue && !busy ? () => void mcqNext() : undefined
                      }
                      busy={busy}
                    />
                  )
                ) : null}
              </QuestQuestionStage>
            )}

            <PracticeCorrectCelebration
              open={correctCelebration != null}
              explanation={correctCelebration?.explanation ?? ""}
              solutionSteps={correctCelebration?.solutionSteps}
              correctAnswer={correctCelebration?.correctAnswer}
              lite={tier === "lite"}
              onNext={() => {
                if (correctCelebration?.mode === "mcq") void mcqNext();
                else void writtenContinue();
              }}
            />

            {err && question && !questionLoading ? (
              <div className="mt-4">
                {isPracticeLockedAttemptError(err) ? (
                  <PracticeLockedAttemptAlert />
                ) : (
                  <p className="text-sm text-red-600">{err}</p>
                )}
              </div>
            ) : null}
          </div>
        </QuestAnimatedSticky>
        <QuestPracticeToolsDrawer
          questionIndex={qIndex}
          questionTotal={total || 1}
          timeLeftSec={timeLeft}
          timeLimitSec={timeLimitSec}
          subtopicTag={question?.subtopicTag}
        />
      </>
    );
  }

  return null;
}
