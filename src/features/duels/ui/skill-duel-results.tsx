"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { QuestKindMetaTag } from "@/shared/ui/meta-tag-patterns";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { stripGuestTryPromptDecorators } from "@/features/quest/guest-try-types";
import { PromptWithMath, PromptWithMathInline } from "@/features/quest/ui/prompt-with-math";
import { getDivisionTheme } from "@/features/divisions/division-ui";
import { cn } from "@/shared/core/utils";
import { emitXpAward } from "@/features/xp/xp-events";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import { fetchDuelResultVerdict } from "@/features/guidance/fetch-verdict-actions";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

type QuestionPublic = {
  prompt: string;
  choices: string[];
  type?: "mcq" | "tf" | "flashcard";
  skillNodeId?: string;
};

type FullQuestion = QuestionPublic & {
  correctIndex: number;
  skillNodeId?: string;
};

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
  forfeitHeadline?: string;
  forfeitDetail?: string;
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
  xpLine: _xpLine,
  forfeitHeadline,
  forfeitDetail,
  listActionLoading,
  error,
  onRemoveFromList,
  onPrefetchHub,
}: Props) {
  const reducedMotion = useReducedMotion();
  const theme = getDivisionTheme(divisionKey);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [verdict, setVerdict] = useState<Verdict | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    void fetchDuelResultVerdict({
      yourScore,
      theirScore,
      total,
      youWon,
      tie,
      rounds: rounds.map((round, index) => {
        const full = fullQuestions?.[index];
        const skillNodeId = full?.skillNodeId ?? round.question.skillNodeId;
        return {
          skillNodeId,
          nodeName: stripGuestTryPromptDecorators(round.question.prompt).slice(0, 80),
          correctIndex: round.correctIndex ?? -1,
          myAnswer: round.myPick ?? -1,
        };
      }),
    }).then((next) => {
      if (!cancelled) setVerdict(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fullQuestions, rounds, theirScore, tie, total, youWon, yourScore]);

  const filteredRounds = useMemo(() => {
    if (filter === "all") return rounds;
    if (filter === "correct") return rounds.filter((r) => r.outcome === "correct");
    if (filter === "missed") return rounds.filter((r) => r.outcome === "wrong");
    return rounds.filter((r) => r.outcome === "skipped");
  }, [rounds, filter]);

  const outcomeTitle = forfeitHeadline ?? (tie ? "Dead heat" : youWon ? "Victory" : "Next run");
  const outcomeSubtitle =
    forfeitDetail ??
    (tie
      ? "Evenly matched — queue again and break the tie."
      : youWon
        ? "You outpaced the field. Keep the streak alive."
        : "Every miss is data. Review below and run it back.");

  const motionEnabled = reducedMotion !== true;

  return (
    <motion.div
      initial={motionEnabled ? { opacity: 0, y: 12 } : false}
      animate={motionEnabled ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <DuelXpCelebration amount={xpAmount} youWon={youWon} tie={tie} />
      <section className={cn(mentrixStudent.hubNotebook, "relative overflow-hidden p-5 sm:p-8")}>
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="mx-hub-type-ui inline-flex items-center gap-2 rounded-full border border-[#A5B4FC] bg-[#EDE9FE] px-3 py-1 text-[10px]">
                <span aria-hidden>{theme.emoji}</span>
                {divisionKey.replace(/-/g, " ")}
              </div>
              <p className="mx-hub-type-ui text-[11px] font-semibold uppercase tracking-[0.24em]">
                Match debrief
              </p>
              <h2 className="mx-hub-ink-title text-3xl uppercase italic sm:text-4xl">{outcomeTitle}</h2>
              <p className="mx-hub-ink-muted max-w-md text-sm leading-relaxed">{outcomeSubtitle}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <ScoreTile label={youLabel} score={yourScore} total={total} highlight={youWon && !tie} motionEnabled={motionEnabled} />
            <div className="flex flex-col items-center justify-center px-2 py-1">
              <MentrixaVocabIcon name="duels" size={22} surface="light" title="Versus" />
              <span className="mx-hub-type-ui mt-1 text-[10px]">vs</span>
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

          {verdict ? (
            <div className={cn(mentrixStudent.hubSticky, "px-4 py-4")}>
              <VerdictPanel verdict={verdict} tone="light" />
            </div>
          ) : (
            <p className={cn(mentrixStudent.hubSticky, "mx-hub-ink-muted px-4 py-3 text-sm")}>
              Building your match verdict…
            </p>
          )}

          <p className="mx-hub-ink-muted inline-flex flex-wrap items-center gap-1.5 text-xs tabular-nums">
            <span>
              {yourScore}/{total} vs {theirScore}/{total}
              {`. ${stats.accuracy}% accuracy`}
            </span>
            {xpAmount > 0 ? (
              <span className="inline-flex items-center gap-1">| <MentrixaVocabIcon name="xp" size={14} surface="light" title="XP earned" />
                +{xpAmount}
              </span>
            ) : null}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="mx-hub-ink-title text-lg">Round-by-round replay</h3>
            <p className="mx-hub-ink-muted mt-0.5 text-sm">
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
                      ? "border-[#6366F1] bg-[#EDE9FE] text-[#4338CA]"
                      : "border-[#A5B4FC] bg-white text-[#64748B] hover:border-[#6366F1] hover:text-[#4338CA]",
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
                mentrixStudent.hubNotebook,
                "overflow-hidden",
                round.outcome === "correct"
                  ? "ring-1 ring-emerald-300/80"
                  : round.outcome === "wrong"
                    ? "ring-1 ring-rose-300/70"
                    : round.outcome === "skipped"
                      ? "ring-1 ring-amber-300/70"
                      : "",
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
                    <span className="mx-hub-math-prose inline text-[#0B1220]">
                      <PromptWithMathInline text={formatPick(round.myPick, round.question.choices)} />
                    </span>
                  </span>
                  <span className="text-[#C4B5FD]">| </span>
                  <span>
                    {themLabel}:{" "}
                    <span className="mx-hub-math-prose inline text-[#0B1220]">
                      <PromptWithMathInline text={formatPick(round.theirPick, round.question.choices)} />
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="mx-hub-math-prose">
                  <PromptWithMath
                    text={stripGuestTryPromptDecorators(round.question.prompt)}
                    variant="light"
                  />
                </div>

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
                          <span className="min-w-0 flex-1 leading-snug">
                            <PromptWithMathInline text={displayChoice(choice, choiceCount)} />
                          </span>
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
          <p className={cn(mentrixStudent.hubEmpty, "text-sm")}>
            No rounds in this filter.
          </p>
        ) : null}
      </section>

      <div className="flex flex-col items-stretch gap-2 pt-2 sm:flex-row sm:justify-center">
        <Button
          asChild
          className={cn(mentrixStudent.pillPrimary, "font-semibold")}
        >
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
          variant="ghost"
          disabled={listActionLoading}
          className={cn(mentrixStudent.hubGhostLink, "font-semibold")}
          onMouseEnter={onPrefetchHub}
          onTouchStart={onPrefetchHub}
          onClick={onRemoveFromList}
        >
          {listActionLoading ? "Removing…" : "Remove from my list"}
        </Button>
      </div>
      {error ? <p className="text-center text-sm font-semibold text-[#B45309]">{error}</p> : null}
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
        mentrixStudent.hubSticky,
        "px-4 py-3",
        highlight && "ring-2 ring-[#6366F1]/40",
        align === "end" ? "text-right" : "text-left",
      )}
    >
      <p className="mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.2em]">{label}</p>
      <p className="mx-hub-timer mt-1 text-3xl tabular-nums sm:text-4xl">
        {score}
        <span className="mx-hub-ink-muted text-base font-semibold">/{total}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E0E7FF]">
        <motion.div
          className={cn(
            "h-full rounded-full",
            highlight ? "bg-[#6366F1]" : "bg-[#A5B4FC]",
          )}
          initial={motionEnabled ? { width: 0 } : false}
          animate={motionEnabled ? { width: `${pct}%` } : false}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
    </motion.div>
  );
}
