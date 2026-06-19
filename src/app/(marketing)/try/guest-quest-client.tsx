"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { XP } from "@/features/xp/xp-constants";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { TiltCard } from "@/shared/ui/tilt-card";
import { Typewriter } from "@/shared/ui/typewriter";
import { BubbleText } from "@/shared/ui/bubble-text";
import { GooeyText } from "@/shared/ui/gooey-text-morphing";
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
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { buildApCalcGuestResultsSummary } from "@/features/quest/guest-try-results";
import { shuffleGuestTryPack } from "@/features/quest/guest-try-shuffle";
import { PracticeCorrectCelebration } from "@/features/quest/ui/practice-correct-celebration";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";

function isGuestTryQuestion(x: unknown): x is GuestTryQuestion {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const kinds = ["mcq", "true_false", "short_answer", "image_mcq", "drag_rank"] as const;
  return (
    typeof o.id === "string" &&
    typeof o.kind === "string" &&
    (kinds as readonly string[]).includes(o.kind) &&
    typeof o.prompt === "string"
  );
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

function streakFromEnd(resultsSoFar: boolean[]): number {
  let s = 0;
  for (let i = resultsSoFar.length - 1; i >= 0; i--) {
    if (resultsSoFar[i]) s++;
    else break;
  }
  return s;
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

export function GuestQuestClient({ defaultSubjects }: { defaultSubjects: { key: string; name: string }[] }) {
  const router = useRouter();
  const tier = useUiPerfTier();
  const [subjectKey, setSubjectKey] = useState(defaultSubjects[0]?.key ?? "general");
  const [subjectName, setSubjectName] = useState(defaultSubjects[0]?.name ?? "General");
  const [phase, setPhase] = useState<"wizard" | "run" | "done">("wizard");
  const [questions, setQuestions] = useState<GuestTryQuestion[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [shortSubmitted, setShortSubmitted] = useState(false);
  const [rankOrder, setRankOrder] = useState<string[]>([]);
  const [rankSubmitted, setRankSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [correctCelebrationOpen, setCorrectCelebrationOpen] = useState(false);

  const correctCount = results.filter(Boolean).length;
  const isPerfect = questions != null && correctCount === questions.length && phase === "done";

  // Trigger confetti when entering results phase
  useEffect(() => {
    if (phase === "done") {
      import("@/features/xp/confetti-burst").then((m) => {
        void m.fireRatingConfetti();
        if (isPerfect) setTimeout(() => void m.fireLevelUpConfetti(), 1200);
      });
    }
  }, [phase, isPerfect]);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/auth/signup");
    const picked = defaultSubjects.find((s) => s.key === subjectKey);
    if (picked) setSubjectName(picked.name.replace(/\s+Division$/i, "").trim());
  }, [subjectKey, defaultSubjects, router]);

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

  const start = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/guest-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectName, difficulty: "advanced" }),
      });
      const j = await res.json();
      if (!j.success) {
        setErr(j.error || "Could not generate demo quest.");
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
    if (!q || q.kind === "short_answer") return;
    if (q.correctIndex === undefined) return;
    const correct = q.correctIndex === idx;
    setSelected(idx);
    setResults((r) => {
      const next = [...r, correct];
      playOutcomeSound(correct);
      hapticOutcome(correct);
      return next;
    });
    if (correct) setCorrectCelebrationOpen(true);
  };

  const submitShortAnswer = () => {
    if (!questions) return;
    const q = questions[qIndex];
    if (!q || q.kind !== "short_answer") return;
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
      setPhase("done");
    } else {
      setQIndex(nx);
    }
  };

  if (phase === "wizard") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto py-12 px-4"
      >
        <TiltCard tiltLimit={3} className="rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.22)] p-6 sm:p-8 block">
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={32} height={32} className="h-8 w-8 opacity-90" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Try Demo</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 h-[32px]">
              <Typewriter text="Try a Quest" speed={70} waitTime={10000} className="text-center" />
            </h2>
          </div>

          <div className="mt-4 min-h-[48px] flex items-center justify-center">
            <ParticleTextEffect 
              words={["GAUNTLET", "FOCUS", "OUTPLAY", "LEVEL UP"]} 
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

    

          <div className="mt-5">
            <Button
              className="w-full h-11 text-base font-semibold flex items-center justify-center gap-2"
              onClick={() => {
                playClickSound();
                start();
              }}
              disabled={busy}
            >
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={18} height={18} className="h-[18px] w-[18px]" />
              {busy ? "Forging your gauntlet…" : "Start free quest →"}
            </Button>
          </div>
        </TiltCard>
      </motion.div>
    );
  }

  if (phase === "run" && questions) {
    const q = questions[qIndex];
    if (!q) return null;

    const isShort = q.kind === "short_answer";
    const isDragRank = q.kind === "drag_rank";
    const choiceAnswered = !isShort && !isDragRank && selected != null;
    const answered = isShort ? shortSubmitted : isDragRank ? rankSubmitted : choiceAnswered;
    const wasCorrect = answered ? results[qIndex] : undefined;
    const imageMcq =
      q.kind === "image_mcq" &&
      Array.isArray(q.optionImageUrls) &&
      Array.isArray(q.options) &&
      q.optionImageUrls.length === q.options.length &&
      q.optionImageUrls.length > 0;

    const progress = ((qIndex + 1) / questions.length) * 100;
    const kindUi = guestTryKindUi(q.kind);
    const promptDisplay = stripGuestTryPromptDecorators(q.prompt);

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${qIndex}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto py-8 px-4"
        >
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Round {qIndex + 1} / {questions.length}
              </span>
              <span className="text-xs font-medium text-slate-500">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                {kindUi.badge}
              </span>
              <p className="text-[11px] text-slate-500 max-w-lg leading-snug">{kindUi.hint}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap mt-0.5">
              Elite gauntlet
            </span>
          </div>

          {/* Question card */}
          <TiltCard tiltLimit={2} className="rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.22)] p-6 sm:p-8 block">
            <div className="mb-4 flex flex-wrap items-center gap-2">
             
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

            <div className="text-slate-900 text-base sm:text-[17px] leading-relaxed whitespace-pre-wrap font-medium">
              {promptDisplay}
            </div>

            {isShort ? (
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
                        submitShortAnswer();
                      }
                    }
                  }}
                  disabled={shortSubmitted}
                  placeholder="Type your answer…"
                  rows={3}
                  className="resize-none text-sm bg-slate-50/80 border-slate-200"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="font-semibold"
                    disabled={shortSubmitted || shortAnswerText.trim().length < 1}
                    onClick={() => {
                      playClickSound();
                      submitShortAnswer();
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
                      <div className="relative h-20 w-full">
                        <Image
                          key={`guest-opt-${qIndex}-${q.id}-${i}-${url}`}
                          src={url}
                          alt=""
                          fill
                          className="object-contain p-1"
                          unoptimized={url.startsWith("data:")}
                          sizes="120px"
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : !isShort && !imageMcq && (!q.options || q.options.length === 0) ? (
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
                        <span className="text-slate-900">{opt}</span>
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
                      <p className="font-semibold mb-1 text-slate-900">Close..read the breakdown</p>
                      <p className="text-sm text-slate-800">{q.explanation}</p>
                      {isShort && q.referenceAnswer ? (
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="text-slate-500">Example answers: </span>
                          <span className="font-semibold text-slate-900">
                            {formatGuestTryReferenceAnswerDisplay(q.referenceAnswer)}
                          </span>
                        </p>
                      ) : null}
                      {isDragRank && q.rankItems ? (
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="text-slate-500">Correct order: </span>
                          <span className="font-semibold text-slate-900">{q.rankItems.join(" → ")}</span>
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
                      {qIndex + 1 >= questions.length ? "See results →" : "Next round →"}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </TiltCard>

          <PracticeCorrectCelebration
            open={correctCelebrationOpen && wasCorrect === true}
            explanation={q.explanation}
            lite={tier === "lite"}
            nextLabel={qIndex + 1 >= questions.length ? "See results" : "Next round"}
            onNext={() => {
              playClickSound();
              next();
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (phase === "done" && questions) {
    const correct = results.filter(Boolean).length;
    const accuracy = Math.round((correct / questions.length) * 100);
    const streakRecord = bestStreakInRun(results);
    const wouldXp = XP.QUEST_COMPLETE + (correct === questions.length ? XP.QUEST_PERFECT_BONUS : 0);
    const isPerfect = correct === questions.length;
    const isApCalcTry = isApCalculusAbSubject(subjectName);
    const apCalcSummary = isApCalcTry
      ? buildApCalcGuestResultsSummary(questions, results)
      : null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-[#0a1628] flex flex-col"
      >
        {/* Animated Victory Rays (Clash Royale Style) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute h-[200vmax] w-[200vmax] opacity-20 bg-[conic-gradient(from_0deg,transparent_0deg_10deg,#3b82f6_20deg_30deg,transparent_40deg_50deg,#3b82f6_60deg_70deg,transparent_80deg_90deg,#3b82f6_100deg_110deg,transparent_120deg_130deg,#3b82f6_140deg_150deg,transparent_160deg_170deg,#3b82f6_180deg_190deg,transparent_200deg_210deg,#3b82f6_220deg_230deg,transparent_240deg_250deg,#3b82f6_260deg_270deg,transparent_280deg_290deg,#3b82f6_300deg_310deg,transparent_320deg_330deg,#3b82f6_340deg_350deg,transparent_360deg)]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/40 via-transparent to-[#0a1628]" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
          {/* Victory Header Banner */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: -40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
            className="mb-8 text-center"
          >
            <div className="h-16 w-full mb-2">
              <GooeyText 
                texts={isPerfect ? ["PERFECT", "FLAWLESS", "VICTORY"] : ["QUEST", "COMPLETE", "VICTORY"]} 
                textClassName="text-white text-5xl md:text-7xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
              />
            </div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[11px] font-bold uppercase tracking-[0.4em] text-blue-400/80"
            >
              Mission Accomplished
            </motion.p>
          </motion.div>

          {/* Main Results Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full max-w-xl rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)]"
          >
            {/* Stats Grid (Clan Dashboard Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-3xl bg-white/5 border border-white/5 p-6 text-center group hover:bg-white/10 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Accuracy</p>
                <div className="text-4xl font-black text-white flex items-baseline justify-center gap-1">
                  <BubbleText text={`${accuracy}%`} activeColor="text-blue-400" />
                </div>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/5 p-6 text-center group hover:bg-white/10 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Correct</p>
                <div className="text-4xl font-black text-white flex items-baseline justify-center gap-1">
                  {apCalcSummary ? (
                    <span className="text-2xl sm:text-3xl leading-tight text-center">
                      {apCalcSummary.scoreLine}
                    </span>
                  ) : (
                    <BubbleText text={`${correct}/${questions.length}`} activeColor="text-blue-400" />
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/5 p-6 text-center group hover:bg-white/10 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Best streak</p>
                <div className="text-4xl font-black text-white flex items-baseline justify-center gap-1">
                  <BubbleText text={`${streakRecord}`} activeColor="text-amber-400" />
                </div>
                <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">Correct in a row</p>
              </div>
            </div>

            {apCalcSummary ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-left"
              >
                <div className="space-y-2">
                  {apCalcSummary.unitLines.map((line) => (
                    <p key={line} className="text-sm text-slate-200">
                      {line}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-sm font-medium text-blue-200">
                  {apCalcSummary.weakestLine}
                </p>
              </motion.div>
            ) : null}

            {/* Reward Display (Clash Royale Style) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20 p-8 text-center mb-8"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-3 relative z-10">Potential Rewards</p>
              <div className="flex items-center justify-center gap-4 relative z-10">
                <div className="relative h-14 w-14 group">
                  <Image src={MENTRIXA_LOGO_PNG} alt="" fill className="object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.5)] group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-left">
                  <span className="block text-4xl font-black text-white leading-none">+{wouldXp} XP</span>
                  <span className="text-[10px] font-medium text-blue-400/80 uppercase tracking-tighter">Experience Points</span>
                </div>
              </div>
              {isPerfect && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-400/10 border border-purple-400/20"
                >
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">✨ FLAWLESS BONUS UNLOCKED</span>
                </motion.div>
              )}
            </motion.div>

            {/* CTA */}
            <div>
              <Button
                asChild
                className="h-14 w-full rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-base font-semibold shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <Link href="/auth/signup" onClick={() => playClickSound()}>
                  {isApCalcTry
                    ? "Create your free account to save this score"
                    : "Create your free account to save this score and compete in your Division."}
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Expressive Characters (Duolingo Style) */}
          <div className="absolute inset-0 pointer-events-none flex items-end justify-between px-12 pb-12 overflow-hidden">
            <motion.div
              initial={{ x: -100, opacity: 0, rotate: -20 }}
              animate={{ x: 0, opacity: 0.3, rotate: -15 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="relative h-48 w-48 mb-[-4rem] ml-[-4rem]"
            >
              <Image src="/icons/mentrixer.svg" alt="" fill className="object-contain" />
            </motion.div>
            <motion.div
              initial={{ x: 100, opacity: 0, rotate: 20 }}
              animate={{ x: 0, opacity: 0.3, rotate: 15 }}
              transition={{ delay: 0.9, type: "spring" }}
              className="relative h-64 w-64 mb-[-6rem] mr-[-6rem]"
            >
              <Image src="/icons/mentrixer.svg" alt="" fill className="object-contain" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
