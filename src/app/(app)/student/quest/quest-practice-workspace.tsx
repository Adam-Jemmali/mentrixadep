"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromptWithMath } from "@/components/quest/prompt-with-math";
import { ShareScoreCardButton } from "@/components/quest/share-score-card";
import {
  createPracticeQuest,
  startPracticeSession,
  getPracticeQuestionPublic,
  submitPracticeMcq,
  submitPracticeWritten,
  finalizePracticeQuest,
  type PracticeQuestionPublic,
} from "@/app/actions/practice-quest";
import type { PracticeDifficulty, PracticePackType } from "@/lib/practice-quest-types";

const DIFFICULTIES: { value: PracticeDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const PACK_TYPES: { value: PracticePackType; label: string; desc: string }[] = [
  { value: "mcq", label: "Multiple choice", desc: "Instant feedback, 4 options each" },
  {
    value: "short_answer",
    label: "Short answer",
    desc: "Written response with feedback on your reasoning",
  },
  { value: "problem_solving", label: "Problem solving", desc: "Math & notation (LaTeX)" },
];

type Phase = "wizard" | "run" | "done";

export function QuestPracticeWorkspace({
  subjectOptions,
}: {
  subjectOptions: { key: string; name: string }[];
}) {
  const [phase, setPhase] = useState<Phase>("wizard");
  const [subjectKey, setSubjectKey] = useState(subjectOptions[0]?.key ?? "general");
  const [customSubject, setCustomSubject] = useState("");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("intermediate");
  const [packType, setPackType] = useState<PracticePackType>("mcq");
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
  const [doneResult, setDoneResult] = useState<{
    correct: number;
    total: number;
    perfect: boolean;
    xpAwarded: number;
    perfectBonus: number;
    mistakeReviews?: { questionId: string; prompt: string; review: string }[];
    totalXp?: number;
  } | null>(null);

  const timeLeftRef = useRef(timeLimitSec);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

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

  const beginPack = async () => {
    setErr(null);
    const picked = subjectOptions.find((o) => o.key === subjectKey);
    const subj =
      customSubject.trim() ||
      (picked ? picked.name.replace(/\s+Division$/i, "").trim() || picked.key : "General");
    if (subj.length < 2) {
      setErr("Choose or enter a subject.");
      return;
    }
    setBusy(true);
    const res = await createPracticeQuest({
      subject: subj,
      difficulty,
      packType,
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
    stopTimer();
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft((t) => Math.max(0, t - 1));
      if (timeLeftRef.current <= 0) {
        stopTimer();
        void (async () => {
          const fin = await finalizePracticeQuest(res.questId, { timedOut: true });
          if (fin.success) {
            setDoneResult(fin.result);
            setPhase("done");
          }
        })();
      }
    }, 1000);
  };

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const finishRun = async (id: string) => {
    stopTimer();
    const fin = await finalizePracticeQuest(id);
    if (fin.success) {
      setDoneResult(fin.result);
      setPhase("done");
    } else {
      setErr(fin.error);
    }
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
    } else {
      setWrittenAwaitingContinue(true);
    }
  };

  const writtenContinue = async () => {
    if (!questId) return;
    setWrittenAwaitingContinue(false);
    const next = qIndex + 1;
    setQIndex(next);
    await loadQuestion(questId, next);
  };

  const mcqNext = async () => {
    if (!questId) return;
    setMcqResult(null);
    setMcqPicked(null);
    const next = qIndex + 1;
    setQIndex(next);
    await loadQuestion(questId, next);
  };

  const goPrevQuestion = async () => {
    if (!questId || busy || qIndex <= 0) return;
    setMcqResult(null);
    setMcqPicked(null);
    setWrittenFeedback(null);
    setWrittenAwaitingContinue(false);
    setWritten("");
    const prev = qIndex - 1;
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (phase === "wizard") {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Practice packs
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">New quest</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Short drills built for where you are right now. Get instant feedback, track your progress, and earn XP as you go.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className="text-xs font-medium text-slate-500">Subject</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={subjectKey}
              onChange={(e) => setSubjectKey(e.target.value)}
            >
              {subjectOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.name}
                </option>
              ))}
            </select>
            <Input
              className="mt-2"
              placeholder="Or type a custom subject…"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Difficulty</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    difficulty === d.value
                      ? "border-mentrixa-500 bg-mentrixa-50 text-mentrixa-900"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Question type</label>
            <div className="mt-2 grid gap-2">
              {PACK_TYPES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPackType(p.value)}
                  className={`text-left rounded-xl border p-3 text-sm ${
                    packType === p.value
                      ? "border-mentrixa-500 bg-mentrixa-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="font-semibold text-slate-900">{p.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <Button className="w-full" disabled={busy} onClick={() => void beginPack()}>
            {busy ? "Generating…" : "Generate quest"}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done" && doneResult) {
    const xpTotal = (doneResult.xpAwarded ?? 0) + (doneResult.perfectBonus ?? 0);
    return (
      <div className="max-w-lg mx-auto py-10 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Quest complete</h2>
        <p className="mt-4 text-4xl font-mono font-bold text-mentrixa-600">
          {doneResult.correct}/{doneResult.total}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {doneResult.perfect ? "Perfect score bonus XP." : "Nice work keep practicing."}
        </p>
        <p className="mt-4 text-lg text-emerald-700 font-medium">+{xpTotal} XP</p>
        {doneResult.mistakeReviews && doneResult.mistakeReviews.length > 0 && (
          <div className="mt-8 text-left border border-slate-200 rounded-lg p-4 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Review mistakes
            </p>
            <ul className="space-y-4">
              {doneResult.mistakeReviews.map((m) => (
                <li key={m.questionId}>
                  <p className="text-xs text-slate-500 line-clamp-2">{m.prompt}</p>
                  <p className="text-sm text-slate-800 mt-1">{m.review}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 flex flex-col items-center gap-3">
          <ShareScoreCardButton
            title="Quest score"
            scoreLine={`Score ${doneResult.correct}/${doneResult.total}`}
            xpLine={`+${xpTotal} XP`}
          />
          <Button
            variant="outline"
            onClick={() => {
              setPhase("wizard");
              setQuestId(null);
              setDoneResult(null);
              setErr(null);
            }}
          >
            New quest
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "run" && question) {
    const progress = ((qIndex + 1) / question.total) * 100;
    return (
      <div
        className="max-w-3xl mx-auto py-6 px-4 touch-pan-y"
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
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-xs font-mono text-slate-500">
            Q{qIndex + 1}/{question.total}
          </p>
          <p
            className={`text-sm font-mono font-semibold ${
              timeLeft < 120 ? "text-red-600" : "text-slate-700"
            }`}
          >
            {formatTime(timeLeft)}
          </p>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-8">
          <motion.div
            className="h-full bg-mentrixa-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {question.kind === "mcq" ? (
              <p className="text-slate-900 font-medium leading-relaxed">{question.prompt}</p>
            ) : question.kind === "problem_solving" ? (
              <PromptWithMath text={question.prompt} />
            ) : (
              <p className="text-slate-900 whitespace-pre-wrap text-sm leading-relaxed">
                {question.prompt}
              </p>
            )}

            {question.kind === "mcq" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {question.options.map((opt, i) => {
                  let cls =
                    "border border-slate-200 rounded-xl p-4 text-left text-sm transition-all hover:border-slate-300";
                  if (mcqResult) {
                    if (i === mcqResult.correctIndex) cls += " border-emerald-500 bg-emerald-50";
                    else if (i === mcqPicked && !mcqResult.correct)
                      cls += " border-red-400 bg-red-50";
                  } else if (mcqPicked === i) cls += " ring-2 ring-mentrixa-400";
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      disabled={!!mcqResult || busy}
                      onClick={() => void onMcqSelect(i)}
                      whileTap={{ scale: 0.98 }}
                      className={cls}
                    >
                      {opt}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {question.kind !== "mcq" && (
              <div className="space-y-3">
                <textarea
                  className="w-full min-h-[120px] rounded-lg border border-slate-200 p-3 text-sm"
                  placeholder="Your answer…"
                  value={written}
                  onChange={(e) => setWritten(e.target.value)}
                  disabled={busy || writtenAwaitingContinue}
                />
                {writtenFeedback && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{writtenFeedback}</p>
                )}
                {writtenAwaitingContinue ? (
                  <Button type="button" onClick={() => void writtenContinue()}>
                    Next question
                  </Button>
                ) : (
                  <Button
                    disabled={busy || !written.trim()}
                    onClick={() => void onWrittenSubmit()}
                  >
                    Submit answer
                  </Button>
                )}
              </div>
            )}

            {question.kind === "mcq" && mcqResult && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900 mb-1">
                  {mcqResult.correct ? "Correct" : "Not quite"}
                </p>
                <p>{mcqResult.explanation}</p>
                {mcqResult.canContinue && !busy && (
                  <Button className="mt-4" variant="outline" onClick={() => void mcqNext()}>
                    Next question
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      </div>
    );
  }

  return null;
}
