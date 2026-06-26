"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock, Sparkles, Swords, Target, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { QuestKindMetaTag } from "@/shared/ui/meta-tag-patterns";
import { stripGuestTryPromptDecorators } from "@/features/quest/guest-try-types";
import { getDivisionTheme } from "@/features/divisions/division-ui";
import { cn } from "@/shared/core/utils";
import { emitXpAward } from "@/features/xp/xp-events";

type QuestionPublic = {
  prompt: string;
  choices: string[];
  type?: "mcq" | "tf" | "flashcard";
};

type FullQuestion = QuestionPublic & { correctIndex: number };

type Props = {
  divisionKey: string;
  questions: QuestionPublic[];
  fullQuestions?: FullQuestion[];
  myAnswers: number[] | null;
  theirAnswers: number[] | null;
  youLabel: string;
  themLabel: string;
  yourScore: number;
  theirScore: number;
  total: number;
  youWon: boolean;
  tie: boolean;
  xpAmount: number;
  xpLine: string;
  listActionLoading: boolean;
  error: string | null;
  onRemoveFromList: () => void;
  onPrefetchHub: () => void;
};

type ReviewFilter = "all" | "correct" | "missed" | "skipped";

function kindLabel(type?: string) {
  if (type === "tf") return "True / false";
  if (type === "flashcard") return "Flashcard";
  return "Quiz";
}

function displayChoice(text: string, choiceCount: number): string {
  if (choiceCount === 2 && (text === "True" || text === "False")) return text;
  return text;
}

function answerOutcome(
  pick: number | undefined,
  correctIndex: number | undefined,
): "correct" | "wrong" | "skipped" | "unknown" {
  if (correctIndex === undefined) return "unknown";
  if (pick === undefined || pick < 0) return "skipped";
  if (pick === correctIndex) return "correct";
  return "wrong";
}

const FILTER_LABELS: Record<ReviewFilter, string> = {
  all: "All rounds",
  correct: "Crushed it",
  missed: "Missed",
  skipped: "Timed out",
};

function DuelXpCelebration({
  amount,
  youWon,
  tie,
}: {
  amount: number;
  youWon: boolean;
  tie: boolean;
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || amount <= 0) return;
    firedRef.current = true;
    emitXpAward({
      amount,
      trigger: "duel",
      message: tie ? "Close match!" : youWon ? "Victory!" : "Keep grinding!",
    });
  }, [amount, tie, youWon]);

  return null;
}

export function SkillDuelResults({
  divisionKey,
  questions,
  fullQuestions,
  myAnswers,
  theirAnswers,
  youLabel,
  themLabel,
  yourScore,
  theirScore,
  total,
  youWon,
  tie,
  xpAmount,
  xpLine,
  listActionLoading,
  error,
  onRemoveFromList,
  onPrefetchHub,
}: Props) {
  const reducedMotion = useReducedMotion();
  const theme = getDivisionTheme(divisionKey);
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const rounds = useMemo(() => {
    return questions.map((q, i) => {
      const full = fullQuestions?.[i];
      const myPick = myAnswers?.[i];
      const theirPick = theirAnswers?.[i];
      const correctIndex = full?.correctIndex;
      const outcome = answerOutcome(myPick, correctIndex);
      return {
        index: i,
        question: q,
        full,
        myPick,
        theirPick,
        correctIndex,
        outcome,
      };
    });
  }, [questions, fullQuestions, myAnswers, theirAnswers]);

  const stats = useMemo(() => {
    const correct = rounds.filter((r) => r.outcome === "correct").length;
    const missed = rounds.filter((r) => r.outcome === "wrong").length;
    const skipped = rounds.filter((r) => r.outcome === "skipped").length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, missed, skipped, accuracy };
  }, [rounds, total]);

  const filteredRounds = useMemo(() => {
    if (filter === "all") return rounds;
    if (filter === "correct") return rounds.filter((r) => r.outcome === "correct");
    if (filter === "missed") return rounds.filter((r) => r.outcome === "wrong");
    return rounds.filter((r) => r.outcome === "skipped");
  }, [rounds, filter]);

  const outcomeTitle = tie ? "Dead heat" : youWon ? "Victory" : "Next run";
  const outcomeSubtitle = tie
    ? "Evenly matched — queue again and break the tie."
    : youWon
      ? "You outpaced the field. Keep the streak alive."
      : "Every miss is data. Review below and run it back.";

  const motionEnabled = reducedMotion !== true;

  return (
    <motion.div
      initial={motionEnabled ? { opacity: 0, y: 12 } : false}
      animate={motionEnabled ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <DuelXpCelebration amount={xpAmount} youWon={youWon} tie={tie} />
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-[#0b1830] via-[#0f2244] to-[#09162c] p-6 text-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.85)] sm:p-8">
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br opacity-40 blur-3xl",
            theme.gradient,
          )}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.22),transparent_70%)]" aria-hidden />

        <div className="relative space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/90">
                <span aria-hidden>{theme.emoji}</span>
                {divisionKey.replace(/-/g, " ")}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/80">
                Match debrief
              </p>
              <h2 className="text-3xl font-black italic tracking-tight sm:text-4xl">{outcomeTitle}</h2>
              <p className="max-w-md text-sm leading-relaxed text-slate-300/95">{outcomeSubtitle}</p>
            </div>

            <motion.div
              initial={motionEnabled ? { scale: 0.9, opacity: 0 } : false}
              animate={motionEnabled ? { scale: 1, opacity: 1 } : false}
              transition={{ delay: 0.15, duration: 0.4 }}
              className={cn(
                "flex min-w-[9.5rem] flex-col items-center rounded-2xl border px-4 py-3 text-center backdrop-blur-md",
                tie
                  ? "border-amber-400/30 bg-amber-500/10"
                  : youWon
                    ? "border-emerald-400/35 bg-emerald-500/10"
                    : "border-white/15 bg-white/5",
              )}
            >
              <Sparkles className="mb-1 h-4 w-4 text-amber-300" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">XP earned</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">+{xpAmount}</p>
            </motion.div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <ScoreTile label={youLabel} score={yourScore} total={total} highlight={youWon && !tie} motionEnabled={motionEnabled} />
            <div className="flex flex-col items-center justify-center px-2 py-1">
              <Swords className="h-5 w-5 text-indigo-300/70" aria-hidden />
              <span className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-slate-500">vs</span>
            </div>
            <ScoreTile
              label={themLabel}
              score={theirScore}
              total={total}
              highlight={!youWon && !tie}
              align="end"
              motionEnabled={motionEnabled}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <StatChip icon={Target} label="Accuracy" value={`${stats.accuracy}%`} />
            <StatChip icon={Check} label="Correct" value={String(stats.correct)} tone="emerald" />
            <StatChip icon={X} label="Missed" value={String(stats.missed)} tone="rose" />
            <StatChip icon={Clock} label="Timed out" value={String(stats.skipped)} tone="amber" />
          </div>

          <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-indigo-100/90">
            {xpLine}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Round-by-round replay</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Your picks, the correct line, and how {themLabel.toLowerCase()} answered.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABELS) as ReviewFilter[]).map((key) => {
              const count =
                key === "all"
                  ? rounds.length
                  : key === "correct"
                    ? stats.correct
                    : key === "missed"
                      ? stats.missed
                      : stats.skipped;
              if (key !== "all" && count === 0) return null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                    filter === key
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
                  )}
                >
                  {FILTER_LABELS[key]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <ol className="space-y-4">
          {filteredRounds.map((round, listIndex) => (
            <motion.li
              key={round.index}
              initial={motionEnabled ? { opacity: 0, y: 10 } : false}
              animate={motionEnabled ? { opacity: 1, y: 0 } : false}
              transition={{ delay: Math.min(listIndex * 0.04, 0.35), duration: 0.3 }}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white shadow-sm",
                round.outcome === "correct"
                  ? "border-emerald-200/80"
                  : round.outcome === "wrong"
                    ? "border-rose-200/70"
                    : round.outcome === "skipped"
                      ? "border-amber-200/70"
                      : "border-slate-200",
              )}
            >
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3",
                  round.outcome === "correct"
                    ? "border-emerald-100 bg-emerald-50/60"
                    : round.outcome === "wrong"
                      ? "border-rose-100 bg-rose-50/50"
                      : round.outcome === "skipped"
                        ? "border-amber-100 bg-amber-50/50"
                        : "border-slate-100 bg-slate-50/80",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    R{round.index + 1}
                  </span>
                  <QuestKindMetaTag label={kindLabel(round.question.type)} tone="light" />
                  <OutcomeBadge outcome={round.outcome} />
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>
                    {youLabel}:{" "}
                    <span className="text-slate-800">
                      {formatPick(round.myPick, round.question.choices)}
                    </span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {themLabel}:{" "}
                    <span className="text-slate-800">
                      {formatPick(round.theirPick, round.question.choices)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <p className="text-sm font-medium leading-relaxed text-slate-900 sm:text-[15px]">
                  {stripGuestTryPromptDecorators(round.question.prompt)}
                </p>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {round.question.choices.map((choice, ci) => {
                    const isCorrect = round.correctIndex === ci;
                    const isMine = round.myPick === ci;
                    const isTheirs = round.theirPick === ci;
                    const choiceCount = round.question.choices.length;

                    return (
                      <li
                        key={ci}
                        className={cn(
                          "relative rounded-xl border-2 px-3 py-2.5 text-sm transition-colors",
                          isCorrect
                            ? "border-emerald-400/70 bg-emerald-50/80 text-emerald-950"
                            : isMine && !isCorrect
                              ? "border-rose-400/60 bg-rose-50/70 text-rose-950"
                              : "border-slate-200 bg-slate-50/50 text-slate-700",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              isCorrect
                                ? "bg-emerald-500 text-white"
                                : isMine
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-200 text-slate-600",
                            )}
                            aria-hidden
                          >
                            {isCorrect ? "✓" : isMine ? "✕" : ci + 1}
                          </span>
                          <span className="leading-snug">{displayChoice(choice, choiceCount)}</span>
                        </div>
                        {(isMine || isTheirs) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {isMine ? (
                              <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                                You
                              </span>
                            ) : null}
                            {isTheirs ? (
                              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">
                                {themLabel}
                              </span>
                            ) : null}
                            {isCorrect ? (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                                Correct
                              </span>
                            ) : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.li>
          ))}
        </ol>

        {filteredRounds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No rounds in this filter.
          </p>
        ) : null}
      </section>

      <div className="flex flex-col items-stretch gap-2 pt-2 sm:flex-row sm:justify-center">
        <Button asChild className="font-semibold">
          <Link
            href="/student/duel"
            onMouseEnter={onPrefetchHub}
            onTouchStart={onPrefetchHub}
          >
            Run it back
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={listActionLoading}
          onMouseEnter={onPrefetchHub}
          onTouchStart={onPrefetchHub}
          onClick={onRemoveFromList}
        >
          {listActionLoading ? "Removing…" : "Remove from my list"}
        </Button>
      </div>
      {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
    </motion.div>
  );
}

function formatPick(pick: number | undefined, choices: string[]) {
  if (pick === undefined || pick < 0) return "—";
  const text = choices[pick];
  if (!text) return "—";
  return displayChoice(text, choices.length);
}

function OutcomeBadge({ outcome }: { outcome: ReturnType<typeof answerOutcome> }) {
  if (outcome === "correct") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
        Crushed it
      </span>
    );
  }
  if (outcome === "wrong") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
        Missed
      </span>
    );
  }
  if (outcome === "skipped") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
        Timed out
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
      Review
    </span>
  );
}

function ScoreTile({
  label,
  score,
  total,
  highlight,
  align = "start",
  motionEnabled,
}: {
  label: string;
  score: number;
  total: number;
  highlight?: boolean;
  align?: "start" | "end";
  motionEnabled: boolean;
}) {
  const pct = total > 0 ? (score / total) * 100 : 0;

  return (
    <motion.div
      initial={motionEnabled ? { opacity: 0, y: 8 } : false}
      animate={motionEnabled ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.35 }}
      className={cn(
        "rounded-2xl border px-4 py-3 backdrop-blur-sm",
        highlight ? "border-white/25 bg-white/10" : "border-white/10 bg-black/20",
        align === "end" ? "text-right" : "text-left",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-3xl font-black tabular-nums text-white sm:text-4xl">
        {score}
        <span className="text-base font-semibold text-slate-500">/{total}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", highlight ? "from-emerald-400 to-teal-300" : "from-indigo-400 to-violet-400")}
          initial={motionEnabled ? { width: 0 } : false}
          animate={motionEnabled ? { width: `${pct}%` } : false}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
    </motion.div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: typeof Target;
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "rose" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "amber"
          ? "text-amber-300"
          : "text-indigo-200";

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <Icon className={cn("h-3.5 w-3.5", toneClass)} aria-hidden />
        {label}
      </div>
      <p className={cn("mt-1 font-mono text-xl font-black tabular-nums", toneClass)}>{value}</p>
    </div>
  );
}
