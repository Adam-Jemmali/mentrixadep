"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/shared/ui/button";

import { emitXpAward } from "@/features/xp/xp-events";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { TiltCard } from "@/shared/ui/tilt-card";
import { Typewriter } from "@/shared/ui/typewriter";
import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { cn } from "@/shared/core/utils";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { getDivisionTheme, divisionTeaser } from "@/features/divisions/division-ui";
import {
  formatGuestTryReferenceAnswerDisplay,
  gradeGuestShortAnswer,
  guestTryKindUi,
  isPlayableGuestTryQuestion,
  stripGuestTryPromptDecorators,
  type GuestTryQuestion,
} from "@/features/quest/guest-try-types";
import { isApCalculusAbSubject, GUEST_NON_AP_CALC_SUBJECT_MESSAGE, AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { buildApCalcGuestDiagnosticVerdict } from "@/features/quest/guest-try-results";
import { shuffleGuestTryPack } from "@/features/quest/guest-try-shuffle";
import { PracticeCorrectCelebration } from "@/features/quest/ui/practice-correct-celebration";
import { GuestVisualPickImage } from "@/features/quest/ui/guest-visual-pick-image";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import { guestTryTimeLimitSec } from "@/features/quest/guest-try-constants";
import { QuestTimerProgressCircle } from "@/shared/ui/progress-circle-patterns";
import { ExamStakesLabel } from "@/shared/ui/tooltip-patterns";
import { QuestKindMetaTag } from "@/shared/ui/meta-tag-patterns";
import { ApCalcSkillGlyph } from "@/features/quest/ui/ap-calc-skill-glyph";
import {
  computeGuestTryWouldXp,
  loadGuestTryRecents,
  saveGuestTryRecent,
  type GuestTryRecentEntry,
} from "@/features/quest/guest-try-recents";
import { buildGuestTrySkillSummary } from "@/features/quest/guest-try-skill-summary";
import { GuestTryResultsPanel } from "@/features/quest/ui/guest-try-results-panel";
import { GuestTryDiagnosticLanding } from "@/features/quest/ui/guest-try-diagnostic-landing";
import { GuestTryRankPreview } from "@/features/quest/ui/guest-try-rank-preview";
import {
  buildGuestTryBreakthroughReceipts,
  buildGuestTryPassportPreview,
} from "@/features/quest/guest-try-passport-preview-pure";
import {
  QuestPracticePackWizard,
  practiceDifficultyLabel,
} from "@/features/quest/ui/quest-practice-pack-wizard";
import type { PracticeDifficulty } from "@/features/quest/practice-quest-types";
import { QuestSessionProgressBar } from "@/shared/ui/progress-bar-patterns";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";
import { StepTraceInput } from "@/features/diagnostics/step-trace-input";
import { getDiagnosticVerdict, type DiagnosticVerdict } from "@/features/diagnostics/diagnostic-verdict";
import { StepTraceDiagnosticResults } from "@/features/diagnostics/step-trace-diagnostic-results";
import type { StepTraceProblem, StepTraceCompletion } from "@/features/diagnostics/step-trace-types";
import type { AccuracyBucketRow } from "@/features/comparison/comparison-context-pure";

function formatGuestDiagnosticStartError(
  res: Response,
  body: { error?: string; retryAfterSeconds?: number; success?: boolean },
): string {
  if (res.status === 429) {
    const retry = Number(body.retryAfterSeconds);
    if (Number.isFinite(retry) && retry > 0) {
      const minutes = Math.max(1, Math.ceil(retry / 60));
      return minutes === 1
        ? "You started too many demos from this network. Wait about a minute, then try again."
        : `You started too many demos from this network. Wait about ${minutes} minutes, then try again.`;
    }
    if (body.error?.includes("Daily demo limit")) {
      return "You used all 3 free demos today. Come back tomorrow or sign up to keep your rank.";
    }
  }
  return body.error || "Could not load diagnostic.";
}

function isGuestTryQuestion(x: unknown): x is GuestTryQuestion {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const kinds = ["mcq", "true_false", "short_answer", "problem_solving", "image_mcq", "drag_rank"] as const;
  return (
    typeof o.id === "string" &&
    typeof o.kind === "string" &&
    (kinds as readonly string[]).includes(o.kind) &&
    typeof o.prompt === "string"
  );
}

/** Strip AI decorators; keep math delimiters for PromptWithMath + formatQuestPromptText. */
function displayGuestQuestText(raw: string): string {
  return stripGuestTryPromptDecorators(raw, { preserveMath: true });
}

// Sound effect utility
function playClickSound() {
  try {
    interface WebKitWindow extends Window {
      webkitAudioContext?: typeof AudioContext;
    }
    const AudioContextClass = window.AudioContext || ((window as WebKitWindow).webkitAudioContext as typeof AudioContext);
    const audioContext = new AudioContextClass();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const freq = 860 + Math.random() * 120;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.78, audioContext.currentTime + 0.03);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.045);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.05);
  } catch {
    // Silently fail if audio context not available
  }
}

function playOutcomeSound(correct: boolean) {
  try {
    interface WebKitWindow extends Window {
      webkitAudioContext?: typeof AudioContext;
    }
    const AudioContextClass =
      window.AudioContext || ((window as WebKitWindow).webkitAudioContext as typeof AudioContext);
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = correct ? "sine" : "triangle";
    const base = correct ? 784 : 162;
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    if (correct) {
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.09);
    } else {
      osc.frequency.exponentialRampToValueAtTime(108, ctx.currentTime + 0.14);
    }
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(correct ? 0.048 : 0.036, ctx.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (correct ? 0.15 : 0.22));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (correct ? 0.17 : 0.24));
  } catch {
    // ignore
  }
}

function hapticOutcome(correct: boolean) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(correct ? [12, 36, 16] : [40, 28, 40, 28]);
    }
  } catch {
    // ignore
  }
}

function bestStreakInRun(resultsSoFar: boolean[]): number {
  let cur = 0;
  let best = 0;
  for (const ok of resultsSoFar) {
    if (ok) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

function shuffleStrings(items: string[]): string[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  if (next.length > 1 && next.every((v, i) => v === items[i])) {
    return shuffleStrings(next);
  }
  return next;
}

export function GuestQuestClient({
  defaultSubjects,
  embedded = false,
  diagnosticMode = false,
}: {
  defaultSubjects: { key: string; name: string }[];
  embedded?: boolean;
  diagnosticMode?: boolean;
}) {
  const router = useRouter();
  const tier = useUiPerfTier();
  const [subjectKey, setSubjectKey] = useState(defaultSubjects[0]?.key ?? "general");
  const [subjectName, setSubjectName] = useState(defaultSubjects[0]?.name ?? "General");
  const [phase, setPhase] = useState<"wizard" | "run" | "done">("wizard");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("intermediate");
  const [questions, setQuestions] = useState<GuestTryQuestion[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [shortSubmitted, setShortSubmitted] = useState(false);
  const [rankOrder, setRankOrder] = useState<string[]>([]);
  const [rankSubmitted, setRankSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [correctCelebrationOpen, setCorrectCelebrationOpen] = useState(false);
  const [recents, setRecents] = useState<GuestTryRecentEntry[]>([]);
  const xpEmittedRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimitSec, setTimeLimitSec] = useState(0);
  const timeLeftRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apCalcSubjectOption =
    defaultSubjects.find((subject) => isApCalculusAbSubject(subject.name)) ??
    ({ key: "ap-calculus-ab", name: AP_CALC_AB_SUBJECT } as const);
  const guestSubjectUnavailable = !isApCalculusAbSubject(subjectName);

  const switchToApCalcSubject = () => {
    setSubjectKey(apCalcSubjectOption.key);
    setSubjectName(apCalcSubjectOption.name);
    setErr(null);
  };

  const apCalcStepTrace =
    diagnosticMode &&
    defaultSubjects.length === 1 &&
    isApCalculusAbSubject(defaultSubjects[0]?.name ?? "");

  const [stepTraceProblem, setStepTraceProblem] = useState<StepTraceProblem | null>(null);
  const [stepTraceMeta, setStepTraceMeta] = useState<{
    unitNumber?: number;
    unitName?: string;
    nodeSlug?: string;
  } | null>(null);
  const [stepTraceVerdict, setStepTraceVerdict] = useState<DiagnosticVerdict | null>(null);

  const clearGuestTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishRun = (timedOut = false) => {
    clearGuestTimer();
    if (timedOut && questions) {
      setResults((r) => {
        const padded = [...r];
        while (padded.length < questions.length) padded.push(false);
        return padded;
      });
    }
    setPhase("done");
  };

  const correctCount = results.filter(Boolean).length;
  const isPerfect = questions != null && correctCount === questions.length && phase === "done";

  useEffect(() => {
    setRecents(loadGuestTryRecents());
  }, []);

  useEffect(() => {
    if (phase !== "done" || !questions || xpEmittedRef.current) return;
    xpEmittedRef.current = true;
    const correct = results.filter(Boolean).length;
    const wouldXp = computeGuestTryWouldXp(correct, questions.length);
    if (wouldXp > 0) {
      emitXpAward({
        amount: wouldXp,
        totalXp: wouldXp,
        trigger: "quest",
        message:
          correct === questions.length
            ? "Perfect score bonus! (Preview. Sign up to save)"
            : "Quest complete! (Preview. Sign up to save)",
        nextObjective: "Create a free account to lock in your rank.",
      });
    }
    saveGuestTryRecent({ subject: subjectName, correct, total: questions.length });
    setRecents(loadGuestTryRecents());
  }, [phase, questions, results, subjectName]);

  useEffect(() => {
    if (phase !== "done") return;
    document.documentElement.dataset.mentrixaQuestResults = "1";
    return () => {
      delete document.documentElement.dataset.mentrixaQuestResults;
    };
  }, [phase]);

  // Trigger confetti when entering results phase (non-AP diagnostic legacy packs only)
  useEffect(() => {
    if (phase === "done" && tier !== "lite" && !isApCalculusAbSubject(subjectName)) {
      import("@/features/xp/confetti-burst").then((m) => {
        void m.fireRatingConfetti();
        if (isPerfect) setTimeout(() => void m.fireLevelUpConfetti(), 1200);
      });
    }
  }, [phase, isPerfect, tier]);

  useEffect(() => {
    return () => clearGuestTimer();
  }, []);

  useEffect(() => {
    if (phase !== "run" || !questions?.length) {
      clearGuestTimer();
      return;
    }
    const limit = guestTryTimeLimitSec(questions.length);
    timeLeftRef.current = limit;
    setTimeLimitSec(limit);
    setTimeLeft(limit);
    clearGuestTimer();
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) finishRun(true);
    }, 1000);
    return () => clearGuestTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer keyed to run phase + pack size only
  }, [phase, questions?.length]);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/auth/signup");
    const picked = defaultSubjects.find((s) => s.key === subjectKey);
    if (picked) setSubjectName(picked.name.replace(/\s+Division$/i, "").trim());
  }, [subjectKey, defaultSubjects, router]);

  useEffect(() => {
    if (!apCalcStepTrace || phase !== "wizard") return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/guest-diagnostic/start", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: true }),
        });
        const j = await res.json();
        if (cancelled || !j.success || !j.resumed || !j.problem) return;
        setStepTraceProblem(j.problem as StepTraceProblem);
        setStepTraceMeta({
          unitNumber: j.unitNumber,
          unitName: j.unitName,
          nodeSlug: j.nodeSlug,
        });
        setPhase("run");
        void warmKatex();
      } catch {
        // No active session — stay on landing.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apCalcStepTrace, phase]);

  useEffect(() => {
    setShortAnswerText("");
    setShortSubmitted(false);
    setSelected(null);
    setRankSubmitted(false);
    setCorrectCelebrationOpen(false);
    const q = questions?.[qIndex];
    if (q?.kind === "drag_rank" && q.rankItems) {
      setRankOrder(shuffleStrings(q.rankItems));
    } else {
      setRankOrder([]);
    }
  }, [qIndex, questions]);

  const startStepTraceDiagnostic = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/guest-diagnostic/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!j.success) {
        setErr(formatGuestDiagnosticStartError(res, j));
        setBusy(false);
        return;
      }
      setStepTraceProblem(j.problem as StepTraceProblem);
      setStepTraceMeta({
        unitNumber: j.unitNumber,
        unitName: j.unitName,
        nodeSlug: j.nodeSlug,
      });
      setStepTraceVerdict(null);
      setPhase("run");
      void warmKatex();
      setBusy(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const onStepTraceComplete = async (completion: StepTraceCompletion) => {
    if (!stepTraceProblem) return;

    let peerAccuracyBuckets: AccuracyBucketRow[] | undefined;
    const allClean =
      completion.steps_correct_first_try === completion.total_steps &&
      completion.steps.every((step) => step.resolved_correctly);

    if (allClean && stepTraceProblem.skillNodeId) {
      try {
        const res = await fetch(
          `/api/guest-diagnostic/comparison?skillNodeId=${encodeURIComponent(stepTraceProblem.skillNodeId)}`,
          { credentials: "include" },
        );
        const j = await res.json();
        if (j.success && Array.isArray(j.buckets)) {
          peerAccuracyBuckets = j.buckets as AccuracyBucketRow[];
        }
      } catch {
        peerAccuracyBuckets = undefined;
      }
    }

    const verdict = getDiagnosticVerdict({
      problem: stepTraceProblem,
      completion,
      unitNumber: stepTraceMeta?.unitNumber,
      unitName: stepTraceMeta?.unitName,
      nodeSlug: stepTraceMeta?.nodeSlug,
      peerAccuracyBuckets,
    });
    setStepTraceVerdict(verdict);
    setPhase("done");
  };

  const start = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/guest-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectName, difficulty }),
      });
      const j = await res.json();
      if (!j.success) {
        if (j.code === "subject_unavailable") {
          setErr(j.error || GUEST_NON_AP_CALC_SUBJECT_MESSAGE);
        } else {
          setErr(j.error || "Could not load demo practice pack.");
        }
        setBusy(false);
        return;
      }
      const rawList = j.questions;
      const cleaned = Array.isArray(rawList)
        ? rawList.filter(isGuestTryQuestion).filter(isPlayableGuestTryQuestion)
        : [];
      if (cleaned.length === 0) {
        setErr("Could not load demo questions. Please try again.");
        setBusy(false);
        return;
      }
      setQuestions(shuffleGuestTryPack(cleaned));
      setQIndex(0);
      setResults([]);
      setSelectedIndices([]);
      xpEmittedRef.current = false;
      setCorrectCelebrationOpen(false);
      setPhase("run");
      void warmKatex();
      setBusy(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const onSelect = (idx: number) => {
    if (!questions) return;
    const q = questions[qIndex];
    if (!q || q.kind === "short_answer" || q.kind === "problem_solving") return;
    if (q.correctIndex === undefined) return;
    const correct = q.correctIndex === idx;
    setSelected(idx);
    setResults((r) => {
      const next = [...r, correct];
      playOutcomeSound(correct);
      hapticOutcome(correct);
      return next;
    });
    setSelectedIndices((picks) => [...picks, idx]);
    if (correct) setCorrectCelebrationOpen(true);
  };

  const submitWrittenAnswer = () => {
    if (!questions) return;
    const q = questions[qIndex];
    if (!q || (q.kind !== "short_answer" && q.kind !== "problem_solving")) return;
    const ref = q.referenceAnswer ?? "";
    const ok = gradeGuestShortAnswer(shortAnswerText, ref);
    setShortSubmitted(true);
    setResults((r) => {
      const next = [...r, ok];
      playOutcomeSound(ok);
      hapticOutcome(ok);
      return next;
    });
    if (ok) setCorrectCelebrationOpen(true);
  };

  const submitRankOrder = () => {
    if (!questions || rankSubmitted) return;
    const q = questions[qIndex];
    if (!q || q.kind !== "drag_rank" || !q.rankItems) return;
    const ok =
      rankOrder.length === q.rankItems.length &&
      rankOrder.every((item, i) => item === q.rankItems![i]);
    setRankSubmitted(true);
    setResults((r) => {
      const next = [...r, ok];
      playOutcomeSound(ok);
      hapticOutcome(ok);
      return next;
    });
    if (ok) setCorrectCelebrationOpen(true);
  };

  const next = () => {
    setCorrectCelebrationOpen(false);
    setSelected(null);
    if (!questions) return;
    const nx = qIndex + 1;
    if (nx >= questions.length) {
      finishRun(false);
    } else {
      setQIndex(nx);
    }
  };

  if (phase === "wizard") {
    const apCalcOnly =
      defaultSubjects.length === 1 &&
      isApCalculusAbSubject(defaultSubjects[0]?.name ?? "");

    if (diagnosticMode && apCalcOnly) {
      return (
        <GuestTryDiagnosticLanding
          embedded={embedded}
          busy={busy}
          err={err}
          onStart={() => {
            playClickSound();
            void startStepTraceDiagnostic();
          }}
        />
      );
    }

    if (apCalcOnly && !embedded) {
      return (
        <div className={mentrixStudent.mainSlim}>
          <QuestPracticePackWizard
            busy={busy}
            err={err}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onStart={() => {
              playClickSound();
              void start();
            }}
            startLabel="Start verified pack"
            subtitle="Free try. Same Quest pack students run inside the app."
          />
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={embedded ? "px-4 py-4" : "max-w-2xl mx-auto py-12 px-4"}
      >
        {!embedded ? (
          <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 text-sm leading-relaxed text-indigo-950 shadow-sm">
            Your rank starts at zero. This Quest moves it. Same timed Practice Pack students run, with rank, XP, and skill tracking on your profile when you sign up.
          </div>
        ) : null}

        {!embedded ? <GuestTryRankPreview totalXp={0} variant="card" className="mb-4" /> : null}

        <TiltCard tiltLimit={3} className="rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.22)] p-6 sm:p-8 block">
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={32} height={32} className="h-8 w-8 opacity-90" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quest Practice preview</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 h-[32px]">
              <Typewriter text="Prove what you know" speed={70} waitTime={10000} className="text-center" />
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              10 timed questions, heavy on multi step problem solving. Advanced difficulty. XP and rank preview match logged in students.
            </p>
          </div>

          <div className="mt-4 min-h-[48px] flex items-center justify-center">
            <ParticleTextEffect 
              words={["PRACTICE", "PROBLEM SOLVE", "SKILL", "QUEST"]} 
              className="text-center"
            />
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Choose a subject
              </label>
              <div className="w-full max-w-[200px]">
                <Input
                  type="search"
                  placeholder="Filter subjects…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 text-xs bg-slate-50/50 border-slate-200"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {defaultSubjects
                .filter((s) => 
                  s.name.toLowerCase().includes(query.toLowerCase()) || 
                  s.key.toLowerCase().includes(query.toLowerCase())
                )
                .map((o) => {
                  const theme = getDivisionTheme(o.key);
                  const active = subjectKey === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        playClickSound();
                        setSubjectKey(o.key);
                      }}
                      className={cn(
                        "group relative flex items-start gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                        active
                          ? cn("shadow-md ring-2 ring-offset-1 z-10", theme.ring, theme.softBg, "border-transparent")
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-inner bg-gradient-to-br",
                        theme.gradient
                      )}>
                        {theme.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-[13px] leading-tight">
                          {o.name.replace(/\s+Division$/i, "")}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2 opacity-80">
                          {divisionTeaser(null, o.name)}
                        </p>
                      </div>
                      {active && (
                        <div className="absolute top-2 right-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", theme.gradient.split(' ')[1])} />
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {err && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {err}
            </motion.div>
          )}

          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">Recents</p>
            {recents.length === 0 ? (
              <p className="text-[11px] text-slate-400">No recent packs yet. Your runs save here in this browser.</p>
            ) : (
              <ul className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {recents.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{r.subject}</p>
                      <p className="text-[10px] text-slate-500">
                        {r.correct}/{r.total}, {r.accuracy}%, +{r.wouldXp} XP preview
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {new Date(r.completedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5">
            {guestSubjectUnavailable ? (
              <div className="rounded-xl border border-violet-200 bg-violet-50/90 px-4 py-4 text-left shadow-sm">
                <p className="text-sm leading-relaxed text-slate-800">
                  {GUEST_NON_AP_CALC_SUBJECT_MESSAGE}
                </p>
                <Button
                  className="mt-4 w-full h-11 text-base font-semibold"
                  onClick={() => {
                    playClickSound();
                    switchToApCalcSubject();
                  }}
                >
                  Try AP Calculus AB now
                </Button>
              </div>
            ) : (
              <Button
                className="w-full h-11 text-base font-semibold flex items-center justify-center gap-2"
                onClick={() => {
                  playClickSound();
                  start();
                }}
                disabled={busy}
              >
                <Image src={MENTRIXA_LOGO_PNG} alt="" width={18} height={18} className="h-[18px] w-[18px]" />
                {busy ? "Loading your practice pack…" : "Start practice pack"}
              </Button>
            )}
          </div>
        </TiltCard>
      </motion.div>
    );
  }

  if (phase === "run" && apCalcStepTrace && stepTraceProblem) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <StepTraceInput
          problem={stepTraceProblem}
          variant="dark"
          onComplete={(completion) => {
            void onStepTraceComplete(completion);
          }}
        />
      </div>
    );
  }

  if (phase === "done" && apCalcStepTrace && stepTraceVerdict) {
    return (
      <StepTraceDiagnosticResults
        verdict={stepTraceVerdict}
        embedded={embedded}
        onRunAnother={() => {
          playClickSound();
          setStepTraceVerdict(null);
          void startStepTraceDiagnostic();
        }}
      />
    );
  }

  if (phase === "run" && questions) {
    const q = questions[qIndex];
    if (!q) return null;

    const isWritten = q.kind === "short_answer" || q.kind === "problem_solving";
    const isDragRank = q.kind === "drag_rank";
    const choiceAnswered = !isWritten && !isDragRank && selected != null;
    const answered = isWritten ? shortSubmitted : isDragRank ? rankSubmitted : choiceAnswered;
    const wasCorrect = answered ? results[qIndex] : undefined;
    const imageMcq =
      q.kind === "image_mcq" &&
      Array.isArray(q.optionImageUrls) &&
      Array.isArray(q.options) &&
      q.optionImageUrls.length === q.options.length &&
      q.optionImageUrls.length > 0;

    const progress = ((qIndex + 1) / questions.length) * 100;
    const kindUi = guestTryKindUi(q.kind);
    const promptDisplay = displayGuestQuestText(q.prompt);

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${qIndex}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className={`${mentrixStudent.mainSlim} touch-pan-y`}
        >
          <div className={`${mentrixStudent.card} w-full px-4 py-6 sm:p-8`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className={`text-xs font-mono ${mentrixStudent.textMutedOnLight}`}>
              Q{qIndex + 1}/{questions.length}
            </p>
            <QuestTimerProgressCircle
              timeLeftSec={timeLeft}
              timeLimitSec={timeLimitSec || guestTryTimeLimitSec(questions.length)}
            />
          </div>
          <div className="mb-8">
            <QuestSessionProgressBar value={progress} />
          </div>

          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <QuestKindMetaTag label={kindUi.badge} tone="light" />
              <p className="text-[11px] text-[#475569] max-w-lg leading-snug">{kindUi.hint}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6366F1] whitespace-nowrap mt-0.5">
              {practiceDifficultyLabel(difficulty)}
            </span>
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {q.nodeName ? (
                <div className="flex items-center gap-2.5">
                  <ApCalcSkillGlyph nodeName={q.nodeName} size="sm" />
                  <span className="text-xs font-semibold text-[#334155]">{q.nodeName}</span>
                </div>
              ) : null}
              {q.examStakes ? <ExamStakesLabel examStakes={q.examStakes} tone="light" /> : null}
            </div>

            {q.promptImageUrl ? (
              <div className="relative mb-6 h-44 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-52">
                <Image
                  key={`guest-prompt-${qIndex}-${q.id}-${q.promptImageUrl}`}
                  src={q.promptImageUrl}
                  alt=""
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 768px) 100vw, 42rem"
                  unoptimized={q.promptImageUrl.startsWith("data:")}
                />
              </div>
            ) : null}

            <div className="text-slate-900 text-base sm:text-[17px] leading-relaxed font-medium">
              <PromptWithMath text={promptDisplay} highlightKeyTerms />
            </div>

            {isWritten ? (
              <motion.div
                className="mt-6 space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                <Textarea
                  value={shortAnswerText}
                  onChange={(e) => setShortAnswerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (shortSubmitted) return;
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      if (shortAnswerText.trim().length >= 1) {
                        playClickSound();
                        submitWrittenAnswer();
                      }
                    }
                  }}
                  disabled={shortSubmitted}
                  placeholder={
                    q.kind === "problem_solving"
                      ? "Show your work and final answer…"
                      : "Type your answer…"
                  }
                  rows={q.kind === "problem_solving" ? 5 : 3}
                  className={cn(
                    "resize-none text-sm bg-slate-50/80 border-slate-200",
                    q.kind === "problem_solving" && "min-h-[120px]",
                  )}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="font-semibold"
                    disabled={shortSubmitted || shortAnswerText.trim().length < 1}
                    onClick={() => {
                      playClickSound();
                      submitWrittenAnswer();
                    }}
                  >
                    Check answer
                  </Button>
                  <span className="text-[10px] text-slate-400">
                    Tip: <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">Ctrl</kbd>{" "}
                    +{" "}
                    <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">Enter</kbd>{" "}
                    to submit
                  </span>
                </div>
              </motion.div>
            ) : isDragRank && q.rankItems && rankOrder.length > 0 ? (
              <motion.div
                className="mt-6 space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                <p className="text-xs font-medium text-slate-500">Drag rows into the correct order (top = first).</p>
                <Reorder.Group
                  axis="y"
                  values={rankOrder}
                  onReorder={rankSubmitted ? () => {} : setRankOrder}
                  className="space-y-2"
                >
                  {rankOrder.map((item) => (
                    <Reorder.Item
                      key={item}
                      value={item}
                      drag={!rankSubmitted}
                      className={cn(
                        "flex cursor-grab items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 text-sm font-medium text-slate-900 active:cursor-grabbing",
                        rankSubmitted
                          ? "cursor-default border-slate-200"
                          : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40",
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                        ⋮⋮
                      </span>
                      {item}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                {!rankSubmitted ? (
                  <Button type="button" className="font-semibold" onClick={() => {
                    playClickSound();
                    submitRankOrder();
                  }}>
                    Lock order
                  </Button>
                ) : null}
              </motion.div>
            ) : imageMcq && q.options && q.optionImageUrls ? (
              <motion.div
                className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                {q.options.map((_opt, i) => {
                  const url = q.optionImageUrls![i]!;
                  const isSel = selected === i;
                  const isCorr = i === q.correctIndex;
                  const showFb = selected != null;

                  let bgClass = "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50";
                  if (showFb && isCorr) bgClass = "bg-blue-50 border-blue-400";
                  else if (showFb && isSel && !isCorr) bgClass = "bg-slate-50 border-slate-400";
                  else if (showFb && !isSel) bgClass = "bg-slate-50 border-slate-200";

                  return (
                    <motion.button
                      key={i}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onSelect(i);
                      }}
                      disabled={selected != null}
                      aria-label={`Option ${String.fromCharCode(65 + i)}`}
                      whileHover={selected == null ? { scale: 1.02 } : {}}
                      whileTap={selected == null ? { scale: 0.98 } : {}}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all ${bgClass} ${
                        showFb ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-[10px] font-bold text-slate-600 shadow-sm">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <GuestVisualPickImage
                        src={url}
                        label={`Option ${String.fromCharCode(65 + i)}`}
                      />
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : !isWritten && !imageMcq && (!q.options || q.options.length === 0) ? (
              <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                This round failed to load choices. Go back and start the quest again.
              </p>
            ) : (
              <motion.div
                className="mt-6 grid gap-3 sm:grid-cols-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                {(q.options ?? []).map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect = i === q.correctIndex;
                  const showFeedback = selected != null;

                  let bgClass = "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50";
                  if (showFeedback && isCorrect) {
                    bgClass = "bg-blue-50 border-blue-400";
                  } else if (showFeedback && isSelected && !isCorrect) {
                    bgClass = "bg-slate-50 border-slate-400";
                  } else if (showFeedback && !isSelected) {
                    bgClass = "bg-slate-50 border-slate-200";
                  }

                  return (
                    <motion.button
                      key={i}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onSelect(i);
                      }}
                      disabled={selected != null}
                      whileHover={selected == null ? { scale: 1.02 } : {}}
                      whileTap={selected == null ? { scale: 0.98 } : {}}
                      className={`relative border-2 rounded-xl p-4 text-left text-sm font-medium transition-all ${bgClass} ${
                        showFeedback ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`min-w-fit h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                            isCorrect && showFeedback
                              ? "bg-emerald-500 border-emerald-500"
                              : isSelected && !isCorrect && showFeedback
                                ? "bg-red-500 border-red-500"
                                : "border-slate-300"
                          }`}
                        >
                          {isCorrect && showFeedback && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className="text-white text-xs font-bold"
                            >
                              ✓
                            </motion.span>
                          )}
                          {isSelected && !isCorrect && showFeedback && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className="text-white text-xs font-bold"
                            >
                              ✕
                            </motion.span>
                          )}
                        </div>
                        <span className="text-slate-900">
                          <PromptWithMath text={displayGuestQuestText(opt)} highlightKeyTerms />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {/* Feedback section — wrong answers only; correct uses celebration popup */}
            <AnimatePresence>
              {answered && wasCorrect === false && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6"
                >
                  <motion.div
                    initial={false}
                    animate={{ x: [0, -7, 7, -5, 5, 0], scale: 1 }}
                    transition={{ duration: 0.42 }}
                  >
                    <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold mb-2 text-slate-900">Close. Read the breakdown</p>
                      <div className="text-sm text-slate-800 leading-relaxed">
                        <PromptWithMath text={displayGuestQuestText(q.explanation)} />
                      </div>
                      {isWritten && q.referenceAnswer ? (
                        <div className="mt-3 text-sm text-slate-700">
                          <p className="text-slate-500 mb-1">Example answers</p>
                          <div className="font-semibold text-slate-900">
                            <PromptWithMath text={formatGuestTryReferenceAnswerDisplay(q.referenceAnswer)} />
                          </div>
                        </div>
                      ) : null}
                      {isDragRank && q.rankItems ? (
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="text-slate-500">Correct order: </span>
                          <span className="font-semibold text-slate-900">{q.rankItems.join(", ")}</span>
                        </p>
                      ) : null}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.25 }}
                    className="mt-4 flex justify-end"
                  >
                    <Button
                      onClick={() => {
                        playClickSound();
                        next();
                      }}
                      className="font-semibold flex items-center gap-1.5"
                    >
                      <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
                      {qIndex + 1 >= questions.length ? "See results" : "Next question"}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <PracticeCorrectCelebration
            open={correctCelebrationOpen && wasCorrect === true}
            explanation={q.explanation}
            lite={tier === "lite"}
            nextLabel={qIndex + 1 >= questions.length ? "See results" : "Next question"}
            onNext={() => {
              playClickSound();
              next();
            }}
          />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (phase === "done" && questions) {
    const correct = results.filter(Boolean).length;
    const streakRecord = bestStreakInRun(results);
    const wouldXp = computeGuestTryWouldXp(correct, questions.length);
    const apCalcVerdict = isApCalculusAbSubject(subjectName)
      ? buildApCalcGuestDiagnosticVerdict(questions, results, selectedIndices)
      : null;
    const skillSummary = buildGuestTrySkillSummary(questions, results, subjectName);
    const breakthroughReceipts = buildGuestTryBreakthroughReceipts(
      questions.map((question, index) => ({
        nodeName: question.nodeName,
        correct: results[index] === true,
      })),
    );
    const passportPreview = buildGuestTryPassportPreview({
      correct,
      total: questions.length,
      wouldXp,
      breakthroughReceipts,
    });

    return (
      <GuestTryResultsPanel
        embedded={embedded}
        subjectName={subjectName}
        correct={correct}
        total={questions.length}
        streakRecord={streakRecord}
        wouldXp={wouldXp}
        skillSummary={skillSummary}
        apCalcVerdict={apCalcVerdict}
        passportPreview={passportPreview}
        onRunAnother={() => {
          playClickSound();
          setPhase("wizard");
          setQuestions(null);
          setResults([]);
          setSelectedIndices([]);
          xpEmittedRef.current = false;
        }}
      />
    );
  }

  return null;
}
