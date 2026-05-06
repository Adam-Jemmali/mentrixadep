"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  submitSkillDuelAnswers,
  submitSkillDuelQuestionAnswer,
  activateSkillDuelSession,
  withdrawPendingSkillDuel,
  hideSkillDuelFromList,
  type DuelPublicRow,
} from "@/app/actions/duel";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { trackClientEvent } from "@/lib/use-track";
import {
  DUEL_SECONDS_PER_QUESTION,
  DUEL_QUESTION_COUNT,
} from "@/lib/duel-constants";
import { XP } from "@/lib/xp-constants";
import { useRealtimeRouterRefresh } from "@/hooks/use-realtime-router-refresh";

type RealtimeSubscribeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

interface Props {
  duel: DuelPublicRow;
  side: "challenger" | "opponent";
}

function kindLabel(type?: string) {
  if (type === "tf") return "True / false";
  if (type === "flashcard") return "Flashcard";
  return "Quiz";
}

function choiceLine(
  text: string,
  index: number,
  choiceCount: number
): string {
  if (choiceCount === 2 && (text === "True" || text === "False")) {
    return text;
  }
  return `${index + 1}. ${text}`;
}

function labelsForSide(duel: DuelPublicRow, side: Props["side"]) {
  const youAreChallenger = side === "challenger";
  const youLabel = "You";
  const themLabel = duel.is_ai_opponent ? "Sparring Quest" : "Opponent";
  return { youLabel, themLabel, youAreChallenger };
}

export function DuelPlayClient({ duel, side }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [listActionLoading, setListActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(DUEL_SECONDS_PER_QUESTION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipTimeoutRef = useRef<number | null>(null);

  const { youLabel, themLabel, youAreChallenger } = labelsForSide(duel, side);

  const myAnswers = youAreChallenger
    ? duel.student_answers
    : duel.opponent_answers;
  const theirAnswers = youAreChallenger
    ? duel.opponent_answers
    : duel.student_answers;

  useEffect(() => {
    router.prefetch("/student/duel");
  }, [router]);

  const myLen = myAnswers?.length ?? 0;
  const theirLen = theirAnswers?.length ?? 0;

  useRealtimeRouterRefresh(
    `skill-duel-${duel.id}`,
    [
      {
        table: "skill_duels",
        event: "UPDATE",
        filter: `id=eq.${duel.id}`,
      },
    ],
    500,
  );

  const currentIndex = myLen;
  const total = duel.questions.length || DUEL_QUESTION_COUNT;

  const youScore =
    (youAreChallenger
      ? duel.student_running_score
      : duel.opponent_running_score) ?? 0;
  const theyScore =
    (youAreChallenger
      ? duel.opponent_running_score
      : duel.student_running_score) ?? 0;

  /** Queue match: either learner can generate the quiz */
  useEffect(() => {
    if (duel.status !== "pending") return;
    if (duel.match_source !== "queue") return;
    let cancelled = false;
    void (async () => {
      const r = await activateSkillDuelSession(duel.id);
      if (!cancelled && r.success) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [duel.id, duel.status, duel.match_source, router]);

  /** Realtime diagnostics only (actual refresh handled by debounced hook). */
  useEffect(() => {
    if (duel.status !== "active" && duel.status !== "pending") return;
    const supabase = createClient();
    const channel = supabase
      .channel(`skill-duel-${duel.id}-status`)
      .subscribe((status: RealtimeSubscribeStatus) => {
        if (status === "SUBSCRIBED") {
          trackClientEvent("realtime_reconnect", {
            channel: `skill-duel-${duel.id}`,
            reason: "subscribed",
          });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          trackClientEvent("realtime_disconnect", {
            channel: `skill-duel-${duel.id}`,
            reason: status.toLowerCase(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [duel.id, duel.status]);

  /** Fallback polling if realtime misses updates (slower interval to reduce UI churn). */
  useEffect(() => {
    if (duel.status !== "active") return;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      router.refresh();
    };
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [duel.status, router]);

  useEffect(() => {
    if (duel.status !== "active") return;
    if (currentIndex >= total) return;

    setTimeLeft(DUEL_SECONDS_PER_QUESTION);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [duel.status, currentIndex, total]);

  useEffect(() => {
    if (duel.status !== "active") return;
    if (timeLeft !== 0) return;
    if (currentIndex >= total) return;
    if (skipTimeoutRef.current === currentIndex) return;
    skipTimeoutRef.current = currentIndex;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await submitSkillDuelQuestionAnswer(
        duel.id,
        currentIndex,
        -1
      );
      if (!cancelled) {
        setLoading(false);
        if (!res.success) setError(res.error);
        else router.refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeLeft, duel.status, duel.id, currentIndex, total, router]);

  const waitingOther =
    duel.status === "active" &&
    myLen >= total &&
    theirLen < total &&
    !duel.is_ai_opponent;

  const prefetchDuelHub = () => {
    router.prefetch("/student/duel");
  };

  async function pickAnswer(ci: number) {
    if (duel.status !== "active") return;
    if (currentIndex >= total) return;
    skipTimeoutRef.current = currentIndex;
    setLoading(true);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    const res = await submitSkillDuelQuestionAnswer(duel.id, currentIndex, ci);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function handleLegacySubmit(answers: number[]) {
    setLoading(true);
    setError(null);
    const res = await submitSkillDuelAnswers(duel.id, answers);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (duel.status === "pending") {
    const init = duel.initiator_id ?? duel.student_id;
    if (side === "opponent" && init === duel.student_id) {
      return null;
    }
    if (side === "challenger" && init === duel.student_id) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center space-y-4"
        >
          <div>
            <p className="text-sm font-medium text-slate-800">
              Waiting for your classmate
            </p>
            <p className="mt-2 text-xs text-slate-500">
              They need to accept so both of you get the same timed questions.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={listActionLoading}
            onClick={() => {
              setListActionLoading(true);
              setError(null);
              void (async () => {
                const r = await withdrawPendingSkillDuel(duel.id);
                setListActionLoading(false);
                if (!r.success) {
                  setError(r.error);
                  return;
                }
                router.refresh();
              })();
            }}
          >
            {listActionLoading ? "Cancelling…" : "Cancel challenge"}
          </Button>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </motion.div>
      );
    }
    return (
      <p className="text-sm text-slate-500">This duel is pending.</p>
    );
  }

  if (duel.status === "cancelled") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {youAreChallenger
            ? "You cancelled this challenge before it started."
            : "The challenger cancelled this request before it started."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={listActionLoading}
          onMouseEnter={prefetchDuelHub}
          onTouchStart={prefetchDuelHub}
          onClick={() => {
            setListActionLoading(true);
            setError(null);
            void (async () => {
              const r = await hideSkillDuelFromList(duel.id);
              setListActionLoading(false);
              if (!r.success) {
                setError(r.error);
                return;
              }
              router.push("/student/duel");
            })();
          }}
        >
          {listActionLoading ? "Removing…" : "Remove from my list"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (duel.status === "declined") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">This duel was declined.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={listActionLoading}
          onMouseEnter={prefetchDuelHub}
          onTouchStart={prefetchDuelHub}
          onClick={() => {
            setListActionLoading(true);
            setError(null);
            void (async () => {
              const r = await hideSkillDuelFromList(duel.id);
              setListActionLoading(false);
              if (!r.success) {
                setError(r.error);
                return;
              }
              router.push("/student/duel");
            })();
          }}
        >
          {listActionLoading ? "Removing…" : "Remove from my list"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (duel.status === "completed") {
    const youWon = youAreChallenger
      ? duel.winner === "student"
      : duel.winner === "opponent";
    const tie = duel.winner === "tie";

    const yourScore = youAreChallenger
      ? (duel.student_score ?? 0)
      : (duel.opponent_score ?? 0);
    const theirScore = youAreChallenger
      ? (duel.opponent_score ?? 0)
      : (duel.student_score ?? 0);

    const xpLine = tie
      ? `+${XP.DUEL_TIE} XP each close match.`
      : youWon
        ? `+${XP.DUEL_WIN} XP strong work.`
        : `+${XP.DUEL_LOSS} XP for finishing win comes next.`;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div
          className={`rounded-lg border px-5 py-6 text-center ${
            tie
              ? "border-slate-200 bg-slate-50"
              : youWon
                ? "border-emerald-200/80 bg-emerald-50/90"
                : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Result
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {tie ? "Draw" : youWon ? "You won" : "You didn’t win this one"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {youLabel}: {yourScore} · {themLabel}: {theirScore}{" "}
            <span className="text-slate-400">/ {total}</span>
          </p>
          <p className="mt-4 text-sm text-slate-700">{xpLine}</p>
        </div>

        <ol className="space-y-4">
          {duel.questions.map((q, i) => {
            const full = duel.fullQuestions?.[i];
            const correct = full?.correctIndex;
            return (
              <li
                key={i}
                className="rounded-lg border border-slate-100 bg-white p-4 text-sm"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {kindLabel(q.type)}
                </p>
                <p className="mt-1 text-slate-800">{q.prompt}</p>
                <ul className="mt-2 space-y-1">
                  {q.choices.map((c, j) => (
                    <li
                      key={j}
                      className={
                        correct === j
                          ? "font-medium text-emerald-800"
                          : "text-slate-600"
                      }
                    >
                      {choiceLine(c, j, q.choices.length)}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={listActionLoading}
            onMouseEnter={prefetchDuelHub}
            onTouchStart={prefetchDuelHub}
            onClick={() => {
              setListActionLoading(true);
              setError(null);
              void (async () => {
                const r = await hideSkillDuelFromList(duel.id);
                setListActionLoading(false);
                if (!r.success) {
                  setError(r.error);
                  return;
                }
                router.push("/student/duel");
              })();
            }}
          >
            {listActionLoading ? "Removing…" : "Remove from my list"}
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </motion.div>
    );
  }

  if (waitingOther) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-800">
          You finished waiting for {themLabel.toLowerCase()}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Scores lock in when both finish. This page updates automatically.
        </p>
      </div>
    );
  }

  if (duel.status === "active" && myLen < total) {
    const q = duel.questions[currentIndex];
    if (!q) {
      return <p className="text-sm text-slate-500">Loading questions…</p>;
    }

    const progress = ((currentIndex + 1) / total) * 100;
    const timerNorm = timeLeft / DUEL_SECONDS_PER_QUESTION;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Live
            </p>
            <p className="mt-0.5 text-sm text-slate-900">
              <span className="font-semibold tabular-nums">{youLabel}</span>:{" "}
              <span className="tabular-nums">{youScore}</span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-semibold tabular-nums">{themLabel}</span>:{" "}
              <span className="tabular-nums">{theyScore}</span>
            </p>
            {!duel.is_ai_opponent && theirLen < myLen ? (
              <p className="mt-1.5 text-xs text-slate-500">
                You are a question ahead totals still compare on accuracy.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="relative h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-white"
              style={{
                background: `conic-gradient(rgb(15 23 42) ${
                  timerNorm * 360
                }deg, rgb(241 245 249) 0deg)`,
              }}
              aria-hidden
            />
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase text-slate-400">
                Time
              </p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {timeLeft}s
              </p>
            </div>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full bg-slate-800"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {kindLabel(q.type)} · Question {currentIndex + 1} of {total}
            </p>
            <p className="mt-2 text-base font-medium leading-snug text-slate-900">
              {q.prompt}
            </p>
            <div className="mt-4 space-y-2">
              {q.choices.map((c, ci) => (
                <button
                  key={ci}
                  type="button"
                  disabled={loading}
                  onClick={() => void pickAnswer(ci)}
                  className="flex w-full items-center rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-50"
                >
                  {choiceLine(c, ci, q.choices.length)}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (duel.status === "active" && myLen >= total) {
    return (
      <p className="text-sm text-slate-600">
        Saving your run…{" "}
        <span className="text-slate-400">If this hangs, refresh the page.</span>
      </p>
    );
  }

  /* Fallback: short legacy sets without per-question progress */
  const submitted =
    side === "challenger"
      ? duel.student_answers != null
      : duel.opponent_answers != null;

  if (submitted) {
    return (
      <p className="text-sm text-slate-500">
        You already submitted answers for this duel.
      </p>
    );
  }

  return (
    <LegacyDuelForm duel={duel} onSubmit={handleLegacySubmit} loading={loading} error={error} />
  );
}

function LegacyDuelForm({
  duel,
  onSubmit,
  loading,
  error,
}: {
  duel: DuelPublicRow;
  onSubmit: (a: number[]) => void;
  loading: boolean;
  error: string | null;
}) {
  const [answers, setAnswers] = useState<number[]>(() =>
    duel.questions.map(() => 0)
  );

  return (
    <div className="space-y-6">
      {duel.questions.map((q, qi) => (
        <div
          key={qi}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {kindLabel(q.type)} · Question {qi + 1}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{q.prompt}</p>
          <div className="mt-3 space-y-2">
            {q.choices.map((c, ci) => (
              <label
                key={ci}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  name={`q-${qi}`}
                  checked={answers[qi] === ci}
                  onChange={() => {
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[qi] = ci;
                      return next;
                    });
                  }}
                />
                {choiceLine(c, ci, q.choices.length)}
              </label>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        type="button"
        disabled={loading}
        onClick={() => onSubmit(answers)}
      >
        {loading ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  );
}
