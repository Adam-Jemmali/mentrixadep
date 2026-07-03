"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { submitSkillDuelAnswers, submitSkillDuelQuestionAnswer, withdrawPendingSkillDuel, hideSkillDuelFromList, forfeitSkillDuel } from "@/features/duels/duel-gameplay";
import { duelForfeitResultCopy } from "@/features/duels/duel-forfeit-pure";
import { acceptQueueMatch, declineQueueMatch, getQueueMatchAcceptance } from "@/features/duels/duel-queue";
import { type DuelPublicRow } from "@/features/duels/duel-reads";
import { Button } from "@/shared/ui/button";
import { createClient } from "@/shared/integrations/supabase/client";
import { trackClientEvent } from "@/shared/integrations/use-track";
import {
  DUEL_SECONDS_PER_QUESTION,
  DUEL_QUESTION_COUNT,
} from "@/features/duels/duel-constants";
import { XP } from "@/features/xp/xp-constants";
import { useRealtimeRouterRefresh } from "@/shared/core/hooks/use-realtime-router-refresh";
import { safeRouterRefresh } from "@/shared/core/safe-router-refresh";
import { SkillDuelChoiceBoard } from "@/features/duels/ui/skill-duel-choice-board";
import { SkillDuelResults } from "@/features/duels/ui/skill-duel-results";
import { stripGuestTryPromptDecorators } from "@/features/quest/guest-try-types";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

type RealtimeSubscribeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

interface Props {
  duel: DuelPublicRow;
  side: "challenger" | "opponent";
  viewerUserId: string;
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

export function DuelPlayClient({ duel, side, viewerUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [listActionLoading, setListActionLoading] = useState(false);
  const [forfeitBusy, setForfeitBusy] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [meAccepted, setMeAccepted] = useState(false);
  const [opponentAccepted, setOpponentAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(DUEL_SECONDS_PER_QUESTION);
  const [optimisticAnswerCount, setOptimisticAnswerCount] = useState<number | null>(null);
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
    void warmKatex();
  }, [router]);

  const myLen = myAnswers?.length ?? 0;
  const theirLen = theirAnswers?.length ?? 0;

  useEffect(() => {
    if (optimisticAnswerCount != null && myLen >= optimisticAnswerCount) {
      setOptimisticAnswerCount(null);
    }
  }, [myLen, optimisticAnswerCount]);

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

  const currentIndex = optimisticAnswerCount ?? myLen;
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

  async function handleLeaveMatch() {
    const confirmed = window.confirm(
      duel.is_ai_opponent
        ? "Leave this spar? It counts as a loss."
        : "Leave this match? Your opponent wins by walkover.",
    );
    if (!confirmed) return;

    setForfeitBusy(true);
    setError(null);
    try {
      const r = await forfeitSkillDuel(duel.id);
      if (!r.success) {
        setError(r.error);
        return;
      }
      safeRouterRefresh(router);
    } catch {
      setError("Could not leave the match.");
    } finally {
      setForfeitBusy(false);
    }
  }

  function leaveMatchButton(className?: string) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={forfeitBusy || loading}
        onClick={() => void handleLeaveMatch()}
        className={cn(
          mentrixStudent.hubGhostLink,
          "text-[11px] font-black uppercase tracking-[0.14em] text-[#B45309] hover:bg-[#FEF3C7]",
          className,
        )}
      >
        {forfeitBusy ? "Leaving…" : "Leave match"}
      </Button>
    );
  }

  async function pickAnswer(ci: number) {
    if (duel.status !== "active") return;
    if (currentIndex >= total) return;
    skipTimeoutRef.current = currentIndex;
    setLoading(true);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    const res = await submitSkillDuelQuestionAnswer(duel.id, currentIndex, ci);
    if (!res.success) {
      setLoading(false);
      setError(res.error);
      return;
    }
    const nextIndex = currentIndex + 1;
    setOptimisticAnswerCount(nextIndex);
    setTimeLeft(DUEL_SECONDS_PER_QUESTION);
    setLoading(false);
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
          className={cn(mentrixStudent.hubNotebook, "space-y-4 px-5 py-6 text-center sm:px-6")}
        >
          <div>
            <p className="mx-hub-ink-title text-base">Match found</p>
            <p className="mx-hub-ink-muted mt-2 text-sm leading-relaxed">
              Both sides must accept before questions begin
              {duel.is_ai_opponent ? " (you and the sparring bot)." : "."}
            </p>
          </div>
          <p className="mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.18em]">
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
              className={cn(mentrixStudent.pillPrimary, "text-[11px] font-black uppercase tracking-[0.14em]")}
            >
              {acceptBusy ? "…" : meAccepted ? "You accepted" : "Accept match"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={acceptBusy}
              onClick={() => void handleQueueDecline()}
              className={cn(mentrixStudent.hubGhostLink, "text-[11px] font-black uppercase tracking-[0.14em]")}
            >
              Decline
            </Button>
          </div>
          {acceptError ? (
            <p className="text-sm font-semibold text-[#B45309]">{acceptError}</p>
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
          className={cn(mentrixStudent.hubSticky, "space-y-4 px-5 py-6 text-center sm:px-6")}
        >
          <div>
            <p className="mx-hub-ink-title text-base">Waiting for your classmate</p>
            <p className="mx-hub-ink-muted mt-2 text-sm leading-relaxed">
              They need to accept so both of you get the same timed questions.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={listActionLoading}
            className={cn(mentrixStudent.hubGhostLink, "text-[11px] font-black uppercase tracking-[0.14em]")}
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
            <p className="text-sm font-semibold text-[#B45309]">{error}</p>
          ) : null}
        </motion.div>
      );
    }
    return (
      <p className="mx-hub-ink-muted text-sm">This duel is pending.</p>
    );
  }

  if (duel.status === "cancelled") {
    return (
      <div className={cn(mentrixStudent.hubNotebook, "space-y-4 px-5 py-5 sm:px-6")}>
        <p className="mx-hub-ink-muted text-sm leading-relaxed">
          {youAreChallenger
            ? "You cancelled this challenge before it started."
            : "The challenger cancelled this request before it started."}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={listActionLoading}
          className={cn(mentrixStudent.hubGhostLink, "text-[11px] font-black uppercase tracking-[0.14em]")}
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
        {error ? <p className="text-sm font-semibold text-[#B45309]">{error}</p> : null}
      </div>
    );
  }

  if (duel.status === "declined") {
    return (
      <div className={cn(mentrixStudent.hubNotebook, "space-y-4 px-5 py-5 sm:px-6")}>
        <p className="mx-hub-ink-muted text-sm">This duel was declined.</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={listActionLoading}
          className={cn(mentrixStudent.hubGhostLink, "text-[11px] font-black uppercase tracking-[0.14em]")}
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
        {error ? <p className="text-sm font-semibold text-[#B45309]">{error}</p> : null}
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
    const youLeft = duel.forfeited_by === viewerUserId;
    const opponentLeft = Boolean(duel.forfeited_by) && duel.forfeited_by !== viewerUserId;
    const forfeitCopy =
      duel.forfeited_by != null
        ? duelForfeitResultCopy({
            youLeft,
            opponentLeft,
            themLabel,
            youWon,
          })
        : null;

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
        forfeitHeadline={forfeitCopy?.headline}
        forfeitDetail={forfeitCopy?.detail}
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
      <div className={cn(mentrixStudent.hubSticky, "space-y-4 px-5 py-8 text-center sm:px-6")}>
        <p className="mx-hub-ink-title text-base">
          You finished waiting for {themLabel.toLowerCase()}
        </p>
        <p className="mx-hub-ink-muted mt-2 text-sm leading-relaxed">
          Scores lock in when both finish, or if someone leaves the match.
        </p>
        <div className="flex justify-center">{leaveMatchButton()}</div>
        {error ? <p className="text-sm font-semibold text-[#B45309]">{error}</p> : null}
      </div>
    );
  }

  if (duel.status === "active" && myLen >= total) {
    return (
      <p className="mx-hub-ink-muted text-sm">
        Saving your run…{" "}
        <span className="text-[#64748B]">If this hangs, refresh the page.</span>
      </p>
    );
  }

  if (duel.status === "active" && currentIndex >= total) {
    return (
      <p className="mx-hub-ink-muted text-sm">Saving your answer…</p>
    );
  }

  if (duel.status === "active" && currentIndex < total) {
    const q = duel.questions[currentIndex];
    if (!q) {
      return <p className="mx-hub-ink-muted text-sm">Loading questions…</p>;
    }

    const progress = ((currentIndex + 1) / total) * 100;
    const timerNorm = timeLeft / DUEL_SECONDS_PER_QUESTION;
    const timerUrgent = timeLeft <= 5;

    return (
      <div className="space-y-5">
        <div
          className={cn(
            mentrixStudent.hubSticky,
            "flex flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-5",
          )}
        >
          <div>
            <p className="mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.2em]">Live</p>
            <p className="mx-hub-ink-title mt-1 text-sm tabular-nums">
              {youLabel}: {youScore}
              <span className="mx-2 mx-hub-ink-muted font-normal">|</span>
              {themLabel}: {theyScore}
            </p>
            {!duel.is_ai_opponent && theirLen < myLen ? (
              <p className="mx-hub-ink-muted mt-1.5 text-xs leading-snug">
                You are a question ahead — totals still compare on accuracy.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <div
                className="relative h-11 w-11 shrink-0 rounded-full border-2 border-[#6366F1] bg-white"
                style={{
                  background: `conic-gradient(#6366F1 ${
                    timerNorm * 360
                  }deg, #E0E7FF 0deg)`,
                }}
                aria-hidden
              />
              <div className="text-right">
                <p className="mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.16em]">Time</p>
                <p
                  className={cn(
                    "mx-hub-timer text-xl tabular-nums sm:text-2xl",
                    timerUrgent && "!text-[#B45309]",
                  )}
                >
                  {timeLeft}s
                </p>
              </div>
            </div>
            {leaveMatchButton()}
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E0E7FF]">
          <motion.div
            className="h-full bg-[#6366F1]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>

        <motion.div
          key={currentIndex}
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          <div className={cn(mentrixStudent.hubNotebook, "p-5 sm:p-6")}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="mx-hub-type-ui inline-flex rounded-full border border-[#A5B4FC] bg-[#EDE9FE] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]">
                  {kindLabel(q.type)}
                </span>
                <p className="mx-hub-ink-muted max-w-lg text-[11px] leading-snug">
                  {kindHint(q.type)}
                </p>
              </div>
              <span className="mx-hub-type-ui whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em]">
                Q {currentIndex + 1} / {total}
              </span>
            </div>

            <div className="mx-hub-math-prose">
              <PromptWithMath
                text={stripGuestTryPromptDecorators(q.prompt)}
                variant="light"
              />
            </div>

            <div className="mt-6">
              <SkillDuelChoiceBoard
                key={`choices-${currentIndex}`}
                choices={q.choices}
                disabled={loading}
                onSelect={(ci) => void pickAnswer(ci)}
              />
            </div>
          </div>
        </motion.div>

        {error ? <p className="text-sm font-semibold text-[#B45309]">{error}</p> : null}
      </div>
    );
  }

  /* Fallback: short legacy sets without per-question progress */
  const submitted =
    side === "challenger"
      ? duel.student_answers != null
      : duel.opponent_answers != null;

  if (submitted) {
    return (
      <p className="mx-hub-ink-muted text-sm">
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
        <div key={qi} className={cn(mentrixStudent.hubNotebook, "p-5 sm:p-6")}>
          <p className="mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.18em]">
            {kindLabel(q.type)} · Question {qi + 1}
          </p>
          <div className="mx-hub-math-prose mt-2">
            <PromptWithMath
              text={stripGuestTryPromptDecorators(q.prompt)}
              variant="light"
            />
          </div>
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
      {error ? <p className="text-sm font-semibold text-[#B45309]">{error}</p> : null}
      <Button
        type="button"
        disabled={loading}
        onClick={() => onSubmit(answers)}
        className={cn(mentrixStudent.pillPrimary, "text-[11px] font-black uppercase tracking-[0.14em]")}
      >
        {loading ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  );
}
