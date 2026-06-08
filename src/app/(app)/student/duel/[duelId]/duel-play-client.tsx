"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  submitSkillDuelAnswers,
  submitSkillDuelQuestionAnswer,
  withdrawPendingSkillDuel,
  hideSkillDuelFromList,
  acceptQueueMatch,
  declineQueueMatch,
  getQueueMatchAcceptance,
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
import { safeRouterRefresh } from "@/lib/safe-router-refresh";
import { SkillDuelChoiceBoard } from "@/components/duel/skill-duel-choice-board";
import { SkillDuelResults } from "@/components/duel/skill-duel-results";
import { TiltCard } from "@/components/ui/tilt-card";
import { stripGuestTryPromptDecorators } from "@/lib/guest-try-types";

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

function kindHint(type?: string) {
  if (type === "tf") return "Drag True or False into the answer slot.";
  if (type === "flashcard") return "Match the term to the right meaning.";
  return "Wrong answers are meant to look tempting — read carefully.";
}

function labelsForSide(duel: DuelPublicRow, side: Props["side"]) {
  const youAreChallenger = side === "challenger";
  const youLabel = "You";
  const themLabel = duel.is_ai_opponent ? "Sparring Quest" : "Opponent";
  return { youLabel, themLabel, youAreChallenger };
}

function isQueueStyleMatchSource(ms: string | null | undefined): boolean {
  return ms === "queue" || ms === "ai_queue";
}

export function DuelPlayClient({ duel, side }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [listActionLoading, setListActionLoading] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [meAccepted, setMeAccepted] = useState(false);
  const [opponentAccepted, setOpponentAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
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

  const queueStylePending =
    duel.status === "pending" && isQueueStyleMatchSource(duel.match_source);

  useEffect(() => {
    if (!queueStylePending) return;

    let cancelled = false;
    const sync = async () => {
      try {
        const resp = await getQueueMatchAcceptance(duel.id);
        if (cancelled || !resp.success) return;
        const s = resp.state;
        setMeAccepted(s.meAccepted);
        setOpponentAccepted(s.opponentAccepted);
        if (s.bothAccepted || s.status === "active") {
          safeRouterRefresh(router);
        }
        if (s.terminal && s.status !== "active") {
          setAcceptError(
            s.status === "cancelled" || s.status === "declined"
              ? "This match was declined."
              : "This match is no longer available.",
          );
        }
      } catch {
        /* retry on next tick */
      }
    };

    void sync();
    const id = setInterval(() => void sync(), 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [duel.id, queueStylePending, router]);

  async function handleQueueAccept() {
    setAcceptBusy(true);
    setAcceptError(null);
    try {
      const r = await acceptQueueMatch(duel.id);
      if (!r.success) {
        setAcceptError(r.error);
        return;
      }
      setMeAccepted(r.state.meAccepted);
      setOpponentAccepted(r.state.opponentAccepted);
      if (r.state.bothAccepted || r.state.status === "active") {
        safeRouterRefresh(router);
      }
    } catch {
      setAcceptError("Could not accept the match.");
    } finally {
      setAcceptBusy(false);
    }
  }

  async function handleQueueDecline() {
    setAcceptBusy(true);
    setAcceptError(null);
    try {
      const r = await declineQueueMatch(duel.id);
      if (!r.success) {
        setAcceptError(r.error);
        return;
      }
      router.push("/student/duel");
    } catch {
      setAcceptError("Could not decline the match.");
    } finally {
      setAcceptBusy(false);
    }
  }

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
      safeRouterRefresh(router);
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
        else safeRouterRefresh(router);
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
    safeRouterRefresh(router);
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
    safeRouterRefresh(router);
  }

  if (duel.status === "pending") {
    if (queueStylePending) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg border border-indigo-200 bg-white px-4 py-6 text-center space-y-4"
        >
          <div>
            <p className="text-sm font-medium text-slate-800">Match found</p>
            <p className="mt-2 text-xs text-slate-500">
              Both sides must accept before questions begin
              {duel.is_ai_opponent ? " (you and the sparring bot)." : "."}
            </p>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {meAccepted && opponentAccepted
              ? "Starting duel…"
              : meAccepted
                ? "Waiting for opponent…"
                : opponentAccepted
                  ? "Opponent is ready — accept to continue"
                  : "Waiting for both players to accept"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              disabled={acceptBusy || meAccepted}
              onClick={() => void handleQueueAccept()}
            >
              {acceptBusy ? "…" : meAccepted ? "You accepted" : "Accept match"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={acceptBusy}
              onClick={() => void handleQueueDecline()}
            >
              Decline
            </Button>
          </div>
          {acceptError ? (
            <p className="text-sm text-red-600">{acceptError}</p>
          ) : null}
        </motion.div>
      );
    }

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
                safeRouterRefresh(router);
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
      ? `+${XP.DUEL_TIE} XP each — close match. Queue again and break the tie.`
      : youWon
        ? `+${XP.DUEL_WIN} XP — strong work. Keep the momentum going.`
        : `+${XP.DUEL_LOSS} XP — every round builds rank. Study the replay below.`;

    const xpAmount = tie ? XP.DUEL_TIE : youWon ? XP.DUEL_WIN : XP.DUEL_LOSS;

    return (
      <SkillDuelResults
        divisionKey={duel.division_key}
        questions={duel.questions}
        fullQuestions={duel.fullQuestions}
        myAnswers={myAnswers}
        theirAnswers={theirAnswers}
        youLabel={youLabel}
        themLabel={themLabel}
        yourScore={yourScore}
        theirScore={theirScore}
        total={total}
        youWon={youWon}
        tie={tie}
        xpAmount={xpAmount}
        xpLine={xpLine}
        listActionLoading={listActionLoading}
        error={error}
        onPrefetchHub={prefetchDuelHub}
        onRemoveFromList={() => {
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
      />
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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Live
            </p>
            <p className="mt-0.5 text-sm font-medium text-zinc-950">
              <span className="font-semibold tabular-nums">{youLabel}</span>:{" "}
              <span className="tabular-nums">{youScore}</span>
              <span className="mx-2 text-zinc-300">|</span>
              <span className="font-semibold tabular-nums">{themLabel}</span>:{" "}
              <span className="tabular-nums">{theyScore}</span>
            </p>
            {!duel.is_ai_opponent && theirLen < myLen ? (
              <p className="mt-1.5 text-xs text-zinc-600">
                You are a question ahead totals still compare on accuracy.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="relative h-11 w-11 shrink-0 rounded-full border border-zinc-200 bg-white"
              style={{
                background: `conic-gradient(rgb(15 23 42) ${
                  timerNorm * 360
                }deg, rgb(241 245 249) 0deg)`,
              }}
              aria-hidden
            />
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase text-zinc-500">
                Time
              </p>
              <p className="text-lg font-semibold tabular-nums text-zinc-950">
                {timeLeft}s
              </p>
            </div>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
          <motion.div
            className="h-full bg-zinc-900"
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
          >
            <TiltCard
              tiltLimit={2}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.22)] sm:p-6"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                    {kindLabel(q.type)}
                  </span>
                  <p className="text-[11px] text-slate-500 max-w-lg leading-snug">
                    {kindHint(q.type)}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">
                  Q {currentIndex + 1} / {total}
                </span>
              </div>

              <p className="text-base font-medium leading-relaxed text-slate-900 sm:text-[17px]">
                {stripGuestTryPromptDecorators(q.prompt)}
              </p>

              <div className="mt-6">
                <SkillDuelChoiceBoard
                  choices={q.choices}
                  disabled={loading}
                  onSelect={(ci) => void pickAnswer(ci)}
                />
              </div>
            </TiltCard>
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
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {kindLabel(q.type)} · Question {qi + 1}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {stripGuestTryPromptDecorators(q.prompt)}
          </p>
          <div className="mt-4">
            <SkillDuelChoiceBoard
              choices={q.choices}
              lockOnSelect={false}
              selectedIndex={answers[qi]}
              onSelect={(ci) => {
                setAnswers((prev) => {
                  const next = [...prev];
                  next[qi] = ci;
                  return next;
                });
              }}
            />
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
