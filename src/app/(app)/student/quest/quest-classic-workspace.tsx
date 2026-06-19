"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { runGsapAction, useGsapEffect } from "@/shared/core/gsap-lazy";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { submitQuest, submitQuestAnswer, type QuestGoal, type QuestMode } from "@/features/quest/classic-quest";
import {
  submitGuestClassicAnswer,
  submitGuestClassicQuest,
  startGuestAdaptiveQuest,
  sendGuestAdaptiveTurn,
  completeGuestAdaptiveQuest,
} from "@/features/quest/guest-classic-client";
import {
  completeAdaptiveClassicQuest,
  startAdaptiveClassicQuest,
} from "@/features/quest/adaptive-classic-quest";
import type { AdaptiveWorldState } from "@/shared/integrations/ai/adaptive-quest";
import { getCurrentUserXp } from "@/features/quest/quest-reads";
import { BackButton } from "@/shared/ui/back-button";
import { emitXpAward } from "@/features/xp/xp-events";
import { computeGuestTryWouldXp } from "@/features/quest/guest-try-recents";
import { buildGuestClassicSolverSummary } from "@/features/quest/guest-try-skill-summary";
import { GuestTryResultsPanel } from "@/features/quest/ui/guest-try-results-panel";
import { QuestIllustration } from "@/components/illustrations";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

const RECENT_KEY = "mentrixa_quests";
const ACTIVE_QUEST_SESSION_KEY = "mentrixa_active_quest_v1";
const ACTIVE_QUEST_MAX_AGE_MS = 1000 * 60 * 30;
const MAX_RECENT = 5;

const GOAL_OPTIONS: { value: QuestGoal; label: string; labelText: string }[] = [
  { value: "exam", label: "Exam prep", labelText: "Exam prep" },
  { value: "interview", label: "Interview prep", labelText: "Interview prep" },
  { value: "assignment", label: "Assignment help", labelText: "Assignment help" },
];

type QuestResponse = {
  questId: string;
  hints: string[];
  reasoning: string;
  solution: string;
  mode: QuestMode;
  goal: QuestGoal;
  variants?: { prompt: string }[];
};

type RecentItem = {
  text: string;
  payload?: QuestResponse;
  /** True after a correct submit. Reopening from Recents is review only. */
  completedLocally?: boolean;
};

type ActiveQuestSnapshot = {
  version: 1;
  savedAt: number;
  prompt: string;
  goal: QuestGoal;
  mode: QuestMode;
  currentQuest: QuestResponse;
  hintsRevealed: number;
  reasoningShown: boolean;
  solutionShown: boolean;
  questCompleted: boolean;
  lastXpAwarded: number | null;
};

function isValidQuestResponse(value: unknown): value is QuestResponse {
  if (!value || typeof value !== "object") return false;
  const q = value as Partial<QuestResponse>;
  return (
    typeof q.questId === "string" &&
    Array.isArray(q.hints) &&
    q.hints.length > 0 &&
    q.hints.every((h) => typeof h === "string") &&
    typeof q.reasoning === "string" &&
    typeof q.solution === "string" &&
    (q.mode === "coach" || q.mode === "exam") &&
    (q.goal === "exam" || q.goal === "interview" || q.goal === "assignment")
  );
}

export function QuestClassicWorkspace({
  guestMode = false,
  showGuestBanner = true,
  guestSubjectName = "General",
  onGuestTryPractice,
  embedded = false,
}: {
  guestMode?: boolean;
  showGuestBanner?: boolean;
  guestSubjectName?: string;
  onGuestTryPractice?: () => void;
  embedded?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const recentKey = guestMode ? "mentrixa_guest_classic_quests" : RECENT_KEY;
  const activeQuestSessionKey = guestMode
    ? "mentrixa_guest_active_quest_v1"
    : ACTIVE_QUEST_SESSION_KEY;

  const [prompt, setPrompt] = useState("");
  const [goal, setGoal] = useState<QuestGoal>("exam");
  const [mode, setMode] = useState<QuestMode>("coach");
  const [isLoading, setIsLoading] = useState(false);

  const [currentQuest, setCurrentQuest] = useState<QuestResponse | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [reasoningShown, setReasoningShown] = useState(false);
  const [solutionShown, setSolutionShown] = useState(false);

  const [xpThisSession, setXpThisSession] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  const [recentQuests, setRecentQuests] = useState<RecentItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [lastXpAwarded, setLastXpAwarded] = useState<number | null>(null);
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [adaptiveQuestId, setAdaptiveQuestId] = useState<string | null>(null);
  const [adaptiveWorldState, setAdaptiveWorldState] = useState<AdaptiveWorldState | null>(null);
  const [adaptiveFeedback, setAdaptiveFeedback] = useState<string[]>([]);
  const [adaptiveSessionActive, setAdaptiveSessionActive] = useState(false);
  const [adaptiveInitialPrompt, setAdaptiveInitialPrompt] = useState("");
  const [guestResultsVisible, setGuestResultsVisible] = useState(false);
  const [guestSolverCorrect, setGuestSolverCorrect] = useState(false);
  const [guestSolverReview, setGuestSolverReview] = useState("");
  const guestSolverPromptRef = useRef("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const xpFillRef = useRef<HTMLDivElement | null>(null);

  const focusSolverPane = () => {
    rightPaneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const finishGuestSolverRun = (correct: boolean, reviewText: string, problemPrompt: string) => {
    guestSolverPromptRef.current = problemPrompt.trim();
    setGuestSolverCorrect(correct);
    setGuestSolverReview(reviewText.trim());
    setGuestResultsVisible(true);
    setQuestCompleted(true);
  };

  // hydrate from URL
  useEffect(() => {
    const q = searchParams.get("prompt");
    if (q != null && q.trim()) setPrompt(decodeURIComponent(q.trim()));
  }, [searchParams]);

  // restore active quest panel after remount unless URL explicitly provides a prompt
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (searchParams.get("prompt")?.trim()) return;

    const raw = window.sessionStorage.getItem(activeQuestSessionKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<ActiveQuestSnapshot>;
      const age = Date.now() - Number(parsed.savedAt ?? 0);
      if (
        parsed.version !== 1 ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > ACTIVE_QUEST_MAX_AGE_MS ||
        typeof parsed.prompt !== "string" ||
        !isValidQuestResponse(parsed.currentQuest)
      ) {
        window.sessionStorage.removeItem(activeQuestSessionKey);
        return;
      }

      const restoredQuest = parsed.currentQuest;
      const restoredHints = Math.max(
        1,
        Math.min(Number(parsed.hintsRevealed ?? 1), restoredQuest.hints.length),
      );

      setPrompt(parsed.prompt);
      if (parsed.goal === "exam" || parsed.goal === "interview" || parsed.goal === "assignment") {
        setGoal(parsed.goal);
      }
      if (parsed.mode === "coach" || parsed.mode === "exam") {
        setMode(parsed.mode);
      }
      setCurrentQuest(restoredQuest);
      setHintsRevealed(restoredHints);
      setReasoningShown(parsed.reasoningShown === true);
      setSolutionShown(parsed.solutionShown === true);
      setQuestCompleted(parsed.questCompleted === true);
      setLastXpAwarded(
        typeof parsed.lastXpAwarded === "number" ? parsed.lastXpAwarded : null,
      );
    } catch {
      window.sessionStorage.removeItem(activeQuestSessionKey);
    }
  }, [searchParams]);

  // persist active quest panel state for remount/reload resilience
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!currentQuest || isLoading || !prompt.trim()) return;

    const snapshot: ActiveQuestSnapshot = {
      version: 1,
      savedAt: Date.now(),
      prompt: prompt.trim(),
      goal,
      mode,
      currentQuest,
      hintsRevealed: Math.max(1, Math.min(hintsRevealed, currentQuest.hints.length)),
      reasoningShown,
      solutionShown,
      questCompleted,
      lastXpAwarded,
    };

    window.sessionStorage.setItem(activeQuestSessionKey, JSON.stringify(snapshot));
  }, [
    currentQuest,
    prompt,
    goal,
    mode,
    hintsRevealed,
    reasoningShown,
    solutionShown,
    questCompleted,
    lastXpAwarded,
    isLoading,
  ]);

  // load recent
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(recentKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const items: RecentItem[] = parsed.map((x: unknown) => {
        if (typeof x === "string") return { text: x };
        if (x && typeof x === "object" && "text" in x) {
          const o = x as Record<string, unknown>;
          return {
            text: String(o.text),
            payload: o.payload as QuestResponse | undefined,
            completedLocally: o.completedLocally === true,
          };
        }
        return { text: String(x) };
      });
      setRecentQuests(items.slice(0, MAX_RECENT));
    } catch {
      setRecentQuests([]);
    }
  }, [recentKey]);

  // load XP
  useEffect(() => {
    if (guestMode) return;
    (async () => {
      const result = await getCurrentUserXp();
      if (result && !("error" in result)) {
        setTotalXp(result.totalXp);
        setStreakDays(result.streakDays);
      }
    })();
  }, [guestMode]);

  const addToRecent = (text: string, payload?: QuestResponse) => {
    if (!text.trim() || typeof window === "undefined") return;
    const item: RecentItem = { text: text.trim(), payload, completedLocally: false };
    setRecentQuests((prev) => {
      const next = [item, ...prev.filter((q) => q.text !== text.trim())].slice(0, MAX_RECENT);
      window.localStorage.setItem(recentKey, JSON.stringify(next));
      return next;
    });
  };

  const markRecentCompleted = (text: string) => {
    const t = text.trim();
    if (!t || typeof window === "undefined") return;
    setRecentQuests((prev) => {
      const next = prev.map((q) =>
        q.text.trim() === t ? { ...q, completedLocally: true } : q,
      );
      window.localStorage.setItem(recentKey, JSON.stringify(next));
      return next;
    });
  };

  const removeFromRecent = (text: string) => {
    if (typeof window === "undefined") return;
    setRecentQuests((prev) => {
      const next = prev.filter((q) => q.text !== text);
      window.localStorage.setItem(recentKey, JSON.stringify(next));
      return next;
    });
  };

  const hints = useMemo(() => currentQuest?.hints ?? [], [currentQuest]);
  const totalHints = hints.length;
  const visibleHints = useMemo(() => hints.slice(0, hintsRevealed), [hints, hintsRevealed]);

  const adaptiveSubjectLabel = useMemo(
    () => GOAL_OPTIONS.find((g) => g.value === goal)?.label ?? "General",
    [goal],
  );

  const resetAdaptiveSession = () => {
    setAdaptiveQuestId(null);
    setAdaptiveWorldState(null);
    setAdaptiveFeedback([]);
    setAdaptiveSessionActive(false);
    setAdaptiveInitialPrompt("");
  };

  const handleAdaptiveSubmit = async (text: string) => {
    setSubmitError(null);
    setRecordError(null);
    setIsLoading(true);

    let questId = adaptiveQuestId;
    if (!questId) {
      const started = guestMode
        ? await startGuestAdaptiveQuest(text, goal, mode, adaptiveSubjectLabel)
        : await startAdaptiveClassicQuest(text, goal, mode, adaptiveSubjectLabel);
      if ("error" in started) {
        setIsLoading(false);
        setSubmitError(started.message);
        return;
      }
      questId = started.questId;
      setAdaptiveQuestId(questId);
      setAdaptiveSessionActive(true);
      setAdaptiveInitialPrompt(text);
      addToRecent(text);
      setCurrentQuest(null);
    }

    try {
      if (guestMode) {
        const turn = await sendGuestAdaptiveTurn({
          questId,
          message: text,
          priorWorldState: adaptiveWorldState,
          subject: adaptiveSubjectLabel,
        });
        if ("message" in turn) {
          setSubmitError(turn.message);
          if (!adaptiveWorldState) {
            resetAdaptiveSession();
            setPrompt(text);
          }
          setIsLoading(false);
          return;
        }
        const turnResult = turn;
        setAdaptiveFeedback((prev) => [...prev, turnResult.feedback]);
        setAdaptiveWorldState(turnResult.updatedWorldState);
        setPrompt("");
        if (turnResult.isResolved) {
          const fin = await completeGuestAdaptiveQuest(questId);
          if (fin && "error" in fin) {
            setRecordError(fin.message);
          } else if (fin) {
            markRecentCompleted(adaptiveInitialPrompt || text);
            setPrompt(adaptiveInitialPrompt || text);
            setLastXpAwarded(fin.xpAwarded ?? 0);
            setXpThisSession((s) => s + (fin.xpAwarded ?? 0));
            finishGuestSolverRun(
              true,
              turnResult.feedback || "Adaptive challenge complete.",
              adaptiveInitialPrompt || text,
            );
            if ((fin.xpAwarded ?? 0) > 0) {
              emitXpAward({
                amount: fin.xpAwarded ?? 0,
                totalXp: fin.totalXp ?? totalXp,
                trigger: "quest",
                message: "Adaptive challenge complete! (Preview. Sign up to save)",
              });
            }
          }
        }
        setIsLoading(false);
        focusSolverPane();
        return;
      }

      const res = await fetch("/api/quests/adaptive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId,
          message: text,
          priorWorldState: adaptiveWorldState,
          subject: adaptiveSubjectLabel,
        }),
      });

      const data = (await res.json()) as {
        feedback?: string;
        updatedWorldState?: AdaptiveWorldState;
        isResolved?: boolean;
        error?: string;
      };

      if (!res.ok || !data.feedback || !data.updatedWorldState) {
        setSubmitError(data.error ?? "Adaptive challenge failed. Try again.");
        if (!adaptiveWorldState) {
          resetAdaptiveSession();
          setPrompt(text);
        }
        setIsLoading(false);
        return;
      }

      setAdaptiveFeedback((prev) => [...prev, data.feedback!]);
      setAdaptiveWorldState(data.updatedWorldState);
      setPrompt("");

      if (data.isResolved) {
        const fin = await completeAdaptiveClassicQuest(questId);
        if (fin && "error" in fin) {
          setRecordError(fin.message);
        } else if (fin) {
          setQuestCompleted(true);
          markRecentCompleted(adaptiveInitialPrompt || text);
          setPrompt(adaptiveInitialPrompt || text);
          setLastXpAwarded(fin.xpAwarded ?? 0);
          setXpThisSession((s) => s + (fin.xpAwarded ?? 0));
          setTotalXp(fin.totalXp ?? totalXp);
          setStreakDays(fin.streakDays ?? streakDays);
          if ((fin.xpAwarded ?? 0) > 0) {
            emitXpAward({
              amount: fin.xpAwarded ?? 0,
              totalXp: fin.totalXp ?? totalXp,
              trigger: "quest",
              message: "Adaptive challenge complete!",
            });
          }
        }
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Adaptive challenge failed. Try again.",
      );
      if (!adaptiveWorldState) {
        resetAdaptiveSession();
        setPrompt(text);
      }
    } finally {
      setIsLoading(false);
      focusSolverPane();
    }
  };

  const handleSubmit = async (autoText?: string) => {
    // Read from textarea ref when clicking button to avoid stale state from batching
    const text = (autoText ?? textareaRef.current?.value ?? prompt).trim();
    if (!text) return;
    setPrompt(text); // Update immediately for display
    setSubmitError(null);
    setRecordError(null);

    if (adaptiveMode) {
      await handleAdaptiveSubmit(text);
      return;
    }

    setIsLoading(true);

    const result = guestMode
      ? await submitGuestClassicQuest(text, goal, mode)
      : await submitQuest(text, goal, mode);

    if ("error" in result && result.error) {
      setIsLoading(false);
      const msg =
        typeof result.message === "string" && result.message.trim()
          ? result.message
          : "Something went wrong. Please try again.";
      setSubmitError(msg);
      return;
    }

    const data = result as {
      questId: string;
      hints: string[];
      reasoning: string;
      solution: string;
      mode: QuestMode;
      variants?: { prompt: string }[];
    };

    if (!data.questId || !Array.isArray(data.hints) || data.hints.length === 0) {
      setIsLoading(false);
      setSubmitError("Got an incomplete response. Please try again.");
      return;
    }
    const payload: QuestResponse = {
      questId: data.questId,
      hints: data.hints,
      reasoning: data.reasoning,
      solution: data.solution,
      mode: data.mode,
      goal,
      variants: data.variants ?? [],
    };
    addToRecent(text, payload);
    setQuestCompleted(false);
    setLastXpAwarded(null);

    // Manually persist to sessionStorage IMMEDIATELY to survive router refreshes/remounts
    if (typeof window !== "undefined") {
      const snapshot: ActiveQuestSnapshot = {
        version: 1,
        savedAt: Date.now(),
        prompt: text.trim(),
        goal,
        mode,
        currentQuest: payload,
        hintsRevealed: payload.hints.length > 0 ? 1 : 0,
        reasoningShown: false,
        solutionShown: false,
        questCompleted: false,
        lastXpAwarded: null,
      };
      window.sessionStorage.setItem(activeQuestSessionKey, JSON.stringify(snapshot));
    }

    setCurrentQuest(payload);
    setHintsRevealed(payload.hints.length > 0 ? 1 : 0);
    setReasoningShown(false);
    setSolutionShown(false);
    setIsLoading(false);

    // Clear URL prompt to prevent it from blocking restoration logic on remounts
    const currentPath = window.location.pathname;
    router.replace(currentPath);

    focusSolverPane();
  };

  const handleRevealNextHint = () => {
    if (!currentQuest) return;
    if (hintsRevealed >= currentQuest.hints.length) return;
    const nextIndex = hintsRevealed + 1;
    setHintsRevealed(nextIndex);

    setTimeout(() => {
      if (!rightPaneRef.current) return;
      const node = rightPaneRef.current.querySelector<HTMLDivElement>(
        `[data-hint-index="${nextIndex - 1}"]`,
      );
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 10);
  };

  const handleSubmitAnswer = async () => {
    const answer = userAnswer.trim();
    if (!currentQuest || questCompleted || !answer) return;
    setRecordError(null);
    setAnswerFeedback(null);
    setSubmittingAnswer(true);
    try {
      const result = guestMode
        ? await submitGuestClassicAnswer(
            currentQuest.questId,
            answer,
            currentQuest.goal ?? goal,
            currentQuest.mode,
          )
        : await submitQuestAnswer(
            currentQuest.questId,
            answer,
            currentQuest.goal ?? goal,
            currentQuest.mode,
          );
      if (!result) {
        setRecordError("Something went wrong. Please try again.");
        return;
      }
      if ("error" in result) {
        if (
          typeof result.message === "string" &&
          result.message.toLowerCase().includes("already finished")
        ) {
          markRecentCompleted(prompt);
          if (guestMode) {
            finishGuestSolverRun(true, "You already completed this preview quest.", prompt);
          } else {
            setQuestCompleted(true);
            setLastXpAwarded(null);
          }
          setRecordError(null);
          return;
        }
        setRecordError(result.message);
        return;
      }
      if (guestMode) {
        const reviewText =
          result.feedback ??
          (result.correct
            ? "Strong work on this problem."
            : "Review the hints and explanation, then sign up to keep practicing.");
        finishGuestSolverRun(result.correct, reviewText, prompt);
        markRecentCompleted(prompt);
        setLastXpAwarded(result.correct ? (result.xpAwarded ?? 0) : 0);
        if (result.correct) {
          setXpThisSession((s) => s + (result.xpAwarded ?? 0));
          setUserAnswer("");
          setAnswerFeedback(null);
          if ((result.xpAwarded ?? 0) > 0) {
            emitXpAward({
              amount: result.xpAwarded ?? 0,
              totalXp: result.totalXp ?? totalXp,
              trigger: "quest",
              message: "Quest complete! (Preview. Sign up to save)",
            });
          }
        } else {
          setAnswerFeedback(reviewText);
        }
        return;
      }
      if (result.correct) {
        setQuestCompleted(true);
        markRecentCompleted(prompt);
        setLastXpAwarded(result.xpAwarded ?? 0);
        setXpThisSession((s) => s + (result.xpAwarded ?? 0));
        setTotalXp(result.totalXp ?? totalXp);
        setStreakDays(result.streakDays ?? streakDays);
        setUserAnswer("");
        setAnswerFeedback(null);
        // Emit XP award event for floating animation and navbar pulse
        if ((result.xpAwarded ?? 0) > 0) {
          emitXpAward({
            amount: result.xpAwarded ?? 0,
            totalXp: result.totalXp ?? totalXp,
            trigger: "quest",
            message: guestMode
              ? "Quest complete! (Preview. Sign up to save)"
              : undefined,
          });
        }
      } else {
        setAnswerFeedback(result.feedback ?? "Not quite right. Review the hints and try again.");
      }
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const retryQuestionText = useMemo(() => {
    const fromAdaptive = adaptiveInitialPrompt.trim();
    const fromPrompt = prompt.trim();
    return fromAdaptive || fromPrompt;
  }, [adaptiveInitialPrompt, prompt]);

  const handleRetrySameQuestion = () => {
    const text = retryQuestionText;
    if (!text || isLoading) return;

    setQuestCompleted(false);
    setLastXpAwarded(null);
    setRecordError(null);
    setSubmitError(null);
    setUserAnswer("");
    setAnswerFeedback(null);
    setPrompt(text);
    if (textareaRef.current) textareaRef.current.value = text;

    if (adaptiveMode || adaptiveSessionActive) {
      resetAdaptiveSession();
      setAdaptiveMode(true);
    } else {
      setCurrentQuest(null);
      setHintsRevealed(0);
      setReasoningShown(false);
      setSolutionShown(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(activeQuestSessionKey);
      }
    }

    void handleSubmit(text);
  };

  const getAnswerPlaceholder = () => {
    const g = currentQuest?.goal ?? goal;
    const m = currentQuest?.mode ?? mode;
    if (g === "interview")
      return "Summarize your approach or key points (as you would in an interview)...";
    if (g === "assignment" && m === "exam")
      return "Show your work: solution, code, or proof...";
    if (g === "assignment")
      return "Paste your solution, code, or explain your steps...";
    if (m === "exam")
      return "Type your final answer...";
    return "Explain your solution or paste your answer...";
  };

  const handleAskAnother = () => {
    setCurrentQuest(null);
    setQuestCompleted(false);
    setLastXpAwarded(null);
    setHintsRevealed(0);
    setReasoningShown(false);
    setSolutionShown(false);
    setUserAnswer("");
    setAnswerFeedback(null);
    resetAdaptiveSession();
    setRecordError(null);
    setSubmitError(null);
    setPrompt("");
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(activeQuestSessionKey);
    }
    focusSolverPane();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleRecentClick = (item: RecentItem) => {
    setPrompt(item.text);
    setRecordError(null);
    setUserAnswer("");
    setAnswerFeedback(null);
    if (item.payload) {
      const isDone = !!item.completedLocally;
      const initialHints = isDone ? item.payload.hints.length : 1;

      // Manually persist IMMEDIATELY
      if (typeof window !== "undefined") {
        const snapshot: ActiveQuestSnapshot = {
          version: 1,
          savedAt: Date.now(),
          prompt: item.text.trim(),
          goal,
          mode,
          currentQuest: item.payload,
          hintsRevealed: initialHints,
          reasoningShown: isDone,
          solutionShown: isDone,
          questCompleted: isDone,
          lastXpAwarded: null,
        };
        window.sessionStorage.setItem(activeQuestSessionKey, JSON.stringify(snapshot));
      }

      setCurrentQuest(item.payload);
      setHintsRevealed(initialHints);
      setReasoningShown(isDone);
      setSolutionShown(isDone);
      setQuestCompleted(isDone);
      setLastXpAwarded(null);

      // Clear URL prompt
      const currentPath = window.location.pathname;
      router.replace(currentPath);

      focusSolverPane();
    } else {
      // No cached payload old entry. Submit to fetch and cache.
      if (textareaRef.current) {
        runGsapAction((gsap) => {
          gsap.fromTo(
            textareaRef.current,
            { borderColor: "#2563EB" },
            { borderColor: "#E2E8F0", duration: 0.8 },
          );
        });
      }
      requestAnimationFrame(() => {
        void handleSubmit(item.text);
      });
    }
  };

  const handleSuggestionClick = (text: string) => {
    setPrompt(text);
    // Defer submit so stagger animation and DOM settle. Fixes first click reliability.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => void handleSubmit(text));
    });
  };

  // set XP bar initial state on mount (avoid flash)
  useLayoutEffect(() => {
    if (!xpFillRef.current) return;
    const ratio = Math.min((xpThisSession || 0) / 50, 1);
    runGsapAction((gsap) => {
      gsap.set(xpFillRef.current, {
        scaleX: ratio,
        transformOrigin: "left center",
      });
    });
  }, [xpThisSession]);

  useGsapEffect((gsap) => {
    if (!xpFillRef.current) return;
    const ratio = Math.min((xpThisSession || 0) / 50, 1);
    gsap.to(xpFillRef.current, {
      scaleX: ratio,
      duration: 0.5,
      ease: "power2.out",
      transformOrigin: "left center",
    });
  }, [xpThisSession, totalXp]);

  useGsapEffect((gsap) => {
    if (currentQuest || isLoading) return;
    const nodes = document.querySelectorAll("[data-quest-suggestion]");
    if (!nodes.length) return;
    const timer = window.setTimeout(() => {
      gsap.fromTo(
        nodes,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.04, duration: 0.35, ease: "power2.out" },
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [currentQuest, isLoading]);

  const suggestions = [
    "How does Big O notation work?",
    "Explain dynamic programming.",
    "Difference between stack and heap?",
  ];

  const allHintsRevealed = totalHints > 0 ? hintsRevealed >= totalHints : true;

  if (guestMode && guestResultsVisible) {
    const problemPrompt =
      guestSolverPromptRef.current || prompt.trim() || adaptiveInitialPrompt.trim();
    const skillSummary = buildGuestClassicSolverSummary(
      problemPrompt,
      guestSolverCorrect,
      guestSolverReview ||
        currentQuest?.reasoning ||
        "Review your approach and try the practice pack for more reps.",
    );
    const wouldXp = computeGuestTryWouldXp(guestSolverCorrect ? 1 : 0, 1);

    return (
      <GuestTryResultsPanel
        embedded={embedded}
        subjectName={guestSubjectName}
        correct={guestSolverCorrect ? 1 : 0}
        total={1}
        streakRecord={guestSolverCorrect ? 1 : 0}
        wouldXp={wouldXp}
        skillSummary={skillSummary}
        onRunAnother={onGuestTryPractice}
        runAnotherLabel="Try a practice pack"
        signupHint="Create your free account to save rank, XP, and unlimited problem solving"
      />
    );
  }

  return (
    <div className="mx-surface-light relative bg-white">
      {guestMode && showGuestBanner ? (
        <div className="border-b border-indigo-200 bg-indigo-50/90 px-4 py-3 text-sm leading-relaxed text-indigo-950">
          Same Problem solver students use. Pick exam prep, interview prep, or assignment help.{" "}
          <Link href="/auth/signup" className="font-semibold underline underline-offset-2">
            Sign up free
          </Link>{" "}
          to save quests, XP, and rank.
        </div>
      ) : null}
      <QuestIllustration />
      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] md:h-[calc(100dvh-3.5rem)] md:max-h-[calc(100dvh-3.5rem)]">
        {/* LEFT PANE */}
        <aside className="relative min-h-0 border-b border-slate-200 mx-surface-light bg-white md:h-full md:border-b-0 md:border-r flex flex-col justify-between overflow-y-auto">
          <div className="flex-1 px-5 pt-6 pb-4">
            {!guestMode ? (
              <div className="mb-6">
                <BackButton />
              </div>
            ) : null}

            <div className="mb-4">
              <p className={`${mentrixStudent.sectionEyebrowOnLight} mb-2`}>
                Adaptive challenge mode
              </p>
              <div className="border border-violet-200 rounded-md overflow-hidden grid grid-cols-2 text-[13px] font-semibold h-9 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    if (adaptiveMode) resetAdaptiveSession();
                    setAdaptiveMode(false);
                  }}
                  className={`border-r border-violet-200 transition-colors ${
                    !adaptiveMode
                      ? "bg-indigo-700 text-white"
                      : "bg-white text-zinc-800 hover:bg-violet-50 hover:text-indigo-950"
                  }`}
                >
                  Off
                </button>
                <button
                  type="button"
                  onClick={() => setAdaptiveMode(true)}
                  className={`transition-colors ${
                    adaptiveMode
                      ? "bg-indigo-700 text-white"
                      : "bg-white text-zinc-800 hover:bg-violet-50 hover:text-indigo-950"
                  }`}
                >
                  On
                </button>
              </div>
            </div>

            <label className={`${mentrixStudent.sectionEyebrowOnLight} mb-2 block`}>
              {adaptiveMode && adaptiveWorldState ? "Your response" : "Problem"}
            </label>
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                adaptiveMode && adaptiveWorldState
                  ? "Type your next move in the scenario..."
                  : "Paste your problem or question..."
              }
              className="min-h-[120px] resize-none border border-slate-200 rounded-xl text-[14px] leading-relaxed p-3 bg-white focus-visible:ring-0 focus-visible:border-mentrixa-400 shadow-[0_0_0_3px_rgba(37,99,235,0.08)] outline-none transition-all duration-200 hover:border-slate-300"
            />

            {adaptiveMode && adaptiveFeedback.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <p className={mentrixStudent.sectionEyebrowOnLight}>
                  Scenario feed
                </p>
                <ul className="mt-2 space-y-2">
                  {adaptiveFeedback.map((entry, index) => (
                    <li key={`${index}-${entry.slice(0, 24)}`} className="text-sm text-zinc-800 leading-relaxed">
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {adaptiveMode && adaptiveWorldState && (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                {adaptiveWorldState.scenarioPrinciple ? (
                  <>
                    <p className="text-xs font-semibold text-indigo-800 uppercase tracking-[0.14em]">
                      Scenario principle
                    </p>
                    <p className="mt-1 text-sm text-indigo-950 leading-relaxed">
                      {adaptiveWorldState.scenarioPrinciple}
                    </p>
                  </>
                ) : null}
                <p className={`text-xs font-semibold text-indigo-800 uppercase tracking-[0.14em] ${adaptiveWorldState.scenarioPrinciple ? "mt-3" : ""}`}>
                  Step {adaptiveWorldState.stepIndex} of {adaptiveWorldState.stepTotal}
                </p>
                <p className="mt-2 text-sm text-indigo-950 leading-relaxed">
                  {adaptiveWorldState.currentChallenge}
                </p>
              </div>
            )}

            {/* Recent */}
            <div className="mt-4">
              <p className={`${mentrixStudent.sectionEyebrowOnLight} mb-2`}>Recent</p>
              <div className="rounded-lg border border-violet-200 bg-white p-1">
                {recentQuests.slice(0, MAX_RECENT).map((item) => (
                  <div
                    key={item.text}
                    className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-violet-50 border-b border-violet-100 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleRecentClick(item)}
                      className={`flex-1 text-left text-sm font-medium ${mentrixStudent.textOnLight} hover:text-indigo-700 hover:underline truncate min-w-0`}
                    >
                      {item.text}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromRecent(item.text);
                      }}
                      aria-label="Remove from recents"
                      className={`shrink-0 p-0.5 ${mentrixStudent.textMutedOnLight} hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                {recentQuests.length === 0 && (
                  <p className={`text-[11px] text-purple-500`}>No recent questions yet.</p>
                )}
              </div>
            </div>  

            {/* Goal selector */}
            <div className="border-t border-slate-200 mt-4 pt-4">
              <p className={`${mentrixStudent.sectionEyebrowOnLight} mb-2`}>
                Goal
              </p>
              <div className="flex flex-col gap-2">
                {GOAL_OPTIONS.map((g) => {
                  const selected = goal === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoal(g.value)}
                      className={`w-full h-9 rounded-md border text-sm font-medium transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-950 font-semibold"
                          : "border-violet-200 bg-white text-zinc-800 hover:border-indigo-300 hover:text-indigo-950"
                      }`}
                    >
                      {g.labelText}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode toggle */}
            <div className="border-t border-slate-200 mt-4 pt-4">
              <p className={`${mentrixStudent.sectionEyebrowOnLight} mb-2`}>
                Mode
              </p>
              <div className="border border-violet-200 rounded-md overflow-hidden grid grid-cols-2 text-[13px] font-semibold h-9 bg-white">
                <button
                  type="button"
                  onClick={() => setMode("coach")}
                  className={`border-r border-violet-200 transition-colors ${
                    mode === "coach"
                      ? "bg-indigo-700 text-white"
                      : "bg-white text-zinc-800 hover:bg-violet-50 hover:text-indigo-950"
                  }`}
                >
                  Coach
                </button>
                <button
                  type="button"
                  onClick={() => setMode("exam")}
                  className={`transition-colors ${
                    mode === "exam"
                      ? "bg-indigo-700 text-white"
                      : "bg-white text-zinc-800 hover:bg-violet-50 hover:text-indigo-950"
                  }`}
                >
                  Exam
                </button>
              </div>
            </div>

            {submitError && (
              <p className="mt-3 text-xs text-red-500">{submitError}</p>
            )}

            <Button
              className="w-full mt-4 relative overflow-hidden"
              onClick={() => handleSubmit()}
              disabled={isLoading || !prompt.trim()}
            >
              <span>
                {isLoading
                  ? "Thinking..."
                  : adaptiveMode
                    ? adaptiveWorldState
                      ? "Send response"
                      : "Start challenge"
                    : "Ask Mentrixa"}
              </span>
              {isLoading && (
                <span className="absolute inset-0 rounded-md border border-mentrixa-200 animate-[pulse_1.5s_ease-in-out_infinite]" />
              )}
            </Button>
          </div>

          {/* Bottom XP strip */}
          <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between text-[11px] font-mono text-zinc-600">
            <span>
              {streakDays === 0
                ? "No streak"
                : streakDays === 1
                  ? "1-day streak"
                  : `${streakDays}-day streak`}
            </span>
            <div className="flex-1 mx-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                ref={xpFillRef}
                className="h-full w-full origin-left bg-gradient-to-r from-emerald-400 via-mentrixa-500 to-indigo-500"
              />
            </div>
            <span>
              {guestMode
                ? `${totalXp + xpThisSession} XP preview`
                : `${totalXp} XP`}
            </span>
          </div>
        </aside>

        {/* RIGHT PANE */}
        <section
          ref={rightPaneRef}
          className="relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 bg-white md:min-h-0"
        >
          {/* Adaptive challenge pane */}
          {adaptiveSessionActive && isLoading && (
            <div className="flex min-h-[45vh] items-center justify-center text-sm text-violet-700">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-mentrixa-500 border-t-transparent rounded-full animate-spin" />
                <p className="animate-pulse">Updating scenario...</p>
              </div>
            </div>
          )}

          {adaptiveSessionActive && !isLoading && (
            <div className="max-w-3xl mx-auto">
              <div className="border-b border-slate-100 pb-6 mb-6">
                <p className="text-xs font-mono text-violet-700 mb-2">Your question</p>
                <p className="text-zinc-950 font-medium leading-relaxed whitespace-pre-wrap mb-6">
                  {adaptiveInitialPrompt}
                </p>
                {adaptiveWorldState ? (
                  <>
                    <p className="text-xs font-mono text-violet-700 mb-2">Scenario</p>
                    <p className="text-zinc-900 leading-relaxed mb-4">
                      {adaptiveWorldState.scenarioTitle}
                    </p>
                    {adaptiveWorldState.scenarioPrinciple ? (
                      <>
                        <p className="text-xs font-mono text-violet-700 mb-2">Scenario principle</p>
                        <p className="text-zinc-800 leading-relaxed mb-4">
                          {adaptiveWorldState.scenarioPrinciple}
                        </p>
                      </>
                    ) : null}
                    <p className="text-xs font-mono text-violet-700 mb-2">
                      Step {adaptiveWorldState.stepIndex} of {adaptiveWorldState.stepTotal}
                    </p>
                    <p className="text-zinc-950 font-medium leading-relaxed whitespace-pre-wrap">
                      {adaptiveWorldState.currentChallenge}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-600">Starting scenario...</p>
                )}
              </div>
              {questCompleted && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" onClick={handleAskAnother}>
                    Ask another question
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading || !retryQuestionText}
                    onClick={handleRetrySameQuestion}
                  >
                    Same question, new attempt
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!currentQuest && !adaptiveSessionActive && !isLoading && (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center px-2 sm:px-4 md:h-full md:min-h-0">
              {submitError && (
                <div
                  role="alert"
                  className="mb-6 w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left"
                >
                  <p className="text-sm font-semibold text-red-900">Couldn’t start this quest</p>
                  <p className="text-sm text-red-800 mt-1 leading-relaxed">{submitError}</p>
                </div>
              )}
              <p className="text-sm text-zinc-700">Ask a question to begin.</p>
              <div className="mt-4 max-w-md w-full text-left">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-quest-suggestion
                    onClick={() => handleSuggestionClick(s)}
                    className="block w-full text-sm text-mentrixa-600 hover:underline mt-3 text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active quest document or loading state with persistent question */}
          {(currentQuest || isLoading) && !adaptiveSessionActive && (
            <div className="max-w-3xl mx-auto">
              {/* User prompt - Persistent */}
              <div className="border-b border-slate-100 pb-6 mb-6">
                <p className="text-xs font-mono text-violet-700 mb-2">Your question</p>
                <p className="text-zinc-950 font-medium leading-relaxed whitespace-pre-wrap">
                  {prompt}
                </p>
              </div>

              {isLoading ? (
                <div className="flex min-h-[40vh] items-center justify-center text-sm text-violet-700">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-mentrixa-500 border-t-transparent rounded-full animate-spin" />
                    <p className="animate-pulse">Generating hints…</p>
                  </div>
                </div>
              ) : (
                currentQuest && (
                  <>
                    {/* Hints */}
                    {visibleHints.map((hint, index) => (
                      <HintSection
                        key={index}
                        index={index}
                        total={totalHints}
                        text={hint}
                      />
                    ))}

                    {/* Next hint control */}
                    {!allHintsRevealed && totalHints > 0 && (
                      <div className="flex items-center gap-4 mb-6">
                        <button
                          type="button"
                          onClick={handleRevealNextHint}
                          className="text-sm text-violet-700 hover:text-zinc-800 underline underline-offset-2"
                        >
                          Reveal next hint {totalHints - hintsRevealed} remaining
                        </button>
                        <span className="text-xs font-mono text-violet-700">
                          {hintsRevealed} / {totalHints}
                        </span>
                      </div>
                    )}

                    {/* Reasoning & solution */}
                    {allHintsRevealed && (
                      <>
                        <ReasoningSection
                          text={currentQuest.reasoning}
                          mode={currentQuest.mode}
                          shown={reasoningShown}
                          onShow={() => setReasoningShown(true)}
                        />
                        {currentQuest.mode === "coach" && currentQuest.solution && (
                          <SolutionSection
                            text={currentQuest.solution}
                            shown={solutionShown}
                            onShow={() => setSolutionShown(true)}
                          />
                        )}

                        {/* Variant problems */}
                        <div className="mt-6">
                          <p className={`${mentrixStudent.sectionEyebrowOnLight} mb-3`}>
                            More questions
                          </p>
                          <div className="space-y-2">
                            {(currentQuest.variants ?? []).slice(0, 3).map((v, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSuggestionClick(v.prompt)}
                                className="flex items-baseline text-sm text-mentrixa-600 hover:underline"
                              >
                                <span className="font-mono text-[11px] text-violet-600 mr-3">
                                  {`0${i + 1}`}
                                </span>
                                <span>{v.prompt}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Completion controls: answer input + submit */}
                        <div className="mt-8 pt-6 border-t border-slate-100">
                          {recordError && (
                            <p className="text-xs text-red-500 mb-3">{recordError}</p>
                          )}
                          {questCompleted ? (
                            <div className="flex flex-col gap-3">
                              <p className="text-sm font-medium text-zinc-800">Quest complete!</p>
                              {guestMode ? (
                                <p className="text-xs text-zinc-600 leading-relaxed">
                                  XP preview only.{" "}
                                  <Link href="/auth/signup" className="font-semibold underline underline-offset-2">
                                    Sign up free
                                  </Link>{" "}
                                  to save this quest and earn real rank progress.
                                </p>
                              ) : lastXpAwarded == null ? (
                                <p className="text-xs text-zinc-600 leading-relaxed">
                                  This run is saved in Recents for review only. To answer again for XP, start
                                  a new attempt with the same wording.
                                </p>
                              ) : null}
                              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                                <Button size="sm" onClick={handleAskAnother}>
                                  Ask another question
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isLoading || !retryQuestionText}
                                  onClick={handleRetrySameQuestion}
                                >
                                  Same question, new attempt
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              <p className={mentrixStudent.sectionEyebrowOnLight}>
                                Your answer
                              </p>
                              <Textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder={getAnswerPlaceholder()}
                                className="min-h-[100px] resize-none border border-slate-200 rounded-lg text-sm p-3 bg-slate-50 focus-visible:ring-0 focus-visible:border-mentrixa-400"
                                disabled={submittingAnswer}
                              />
                              {answerFeedback && (
                                <p className="text-xs text-amber-600">{answerFeedback}</p>
                              )}
                              <Button
                                size="sm"
                                onClick={handleSubmitAnswer}
                                disabled={submittingAnswer || !userAnswer.trim()}
                              >
                                {submittingAnswer ? "Checking…" : "Submit answer"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HintSection({ index, total, text }: { index: number; total: number; text: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useGsapEffect((gsap) => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const textEl = el.querySelector<HTMLParagraphElement>("[data-hint-text]");
    if (!textEl) return;

    const content = textEl.textContent ?? "";
    textEl.textContent = "";

    const chars: HTMLSpanElement[] = [];
    for (const ch of content) {
      const span = document.createElement("span");
      span.textContent = ch;
      span.style.opacity = "0";
      textEl.appendChild(span);
      chars.push(span);
    }

    gsap.fromTo(chars, { opacity: 0 }, { opacity: 1, stagger: 0.012, duration: 0, ease: "none" });
  }, []);

  return (
    <div
      ref={containerRef}
      data-hint-index={index}
      className="pb-5 mb-6 border-b border-slate-50"
    >
      <p className="text-xs font-mono text-violet-700 mb-2">
        Hint {index + 1} of {total}
      </p>
      <p
        data-hint-text
        className="text-zinc-700 text-sm leading-relaxed"
      >
        {text}
      </p>
    </div>
  );
}

function ReasoningSection({
  text,
  mode,
  shown,
  onShow,
}: {
  text: string;
  mode: QuestMode;
  shown: boolean;
  onShow: () => void;
}) {
  const ref = useRef<HTMLParagraphElement | null>(null);

  useGsapEffect((gsap) => {
    if (!shown || !ref.current) return;
    const el = ref.current;
    const content = el.textContent ?? "";
    el.textContent = "";
    const chars: HTMLSpanElement[] = [];
    for (const ch of content) {
      const span = document.createElement("span");
      span.textContent = ch;
      span.style.opacity = "0";
      el.appendChild(span);
      chars.push(span);
    }
    gsap.fromTo(chars, { opacity: 0 }, { opacity: 1, stagger: 0.012, duration: 0, ease: "none" });
  }, [shown]);

  if (!text) return null;

  if (!shown) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={onShow}
          className="text-sm text-violet-700 hover:text-zinc-800 underline underline-offset-2"
        >
          Show reasoning ({mode === "exam" ? "no solution" : "with solution"})
        </button>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-slate-200 pl-5 mb-6">
      <p className="text-xs font-mono text-violet-700 mb-2">Reasoning</p>
      <p ref={ref} className="text-zinc-600 text-sm leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function SolutionSection({
  text,
  shown,
  onShow,
}: {
  text: string;
  shown: boolean;
  onShow: () => void;
}) {
  const ref = useRef<HTMLParagraphElement | null>(null);

  useGsapEffect((gsap) => {
    if (!shown || !ref.current) return;
    const el = ref.current;
    const content = el.textContent ?? "";
    el.textContent = "";
    const chars: HTMLSpanElement[] = [];
    for (const ch of content) {
      const span = document.createElement("span");
      span.textContent = ch;
      span.style.opacity = "0";
      el.appendChild(span);
      chars.push(span);
    }
    gsap.fromTo(chars, { opacity: 0 }, { opacity: 1, stagger: 0.012, duration: 0, ease: "none" });
  }, [shown]);

  if (!text) return null;

  if (!shown) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={onShow}
          className="text-sm text-violet-700 hover:text-zinc-800 underline underline-offset-2"
        >
          Show full solution
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
      <p className="text-xs font-mono text-violet-700 mb-2">Full solution</p>
      <p ref={ref} className="text-zinc-950 text-sm leading-relaxed font-mono whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}

