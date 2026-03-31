"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitSkillDuelAnswers, type DuelPublicRow } from "@/app/actions/duel";
import { Button } from "@/components/ui/button";

interface Props {
  duel: DuelPublicRow;
  /** Challenger row (student_id) vs opponent row */
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

export function DuelPlayClient({ duel, side }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(() =>
    duel.questions.map(() => 0),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitted =
    side === "challenger"
      ? duel.student_answers != null
      : duel.opponent_answers != null;

  const waitingOther =
    duel.status === "active" &&
    submitted &&
    ((side === "challenger" && duel.opponent_answers == null) ||
      (side === "opponent" && duel.student_answers == null));

  async function handleSubmit() {
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
        <p className="text-sm text-slate-500">
          Waiting for your classmate to accept this challenge.
        </p>
      );
    }
    return <p className="text-sm text-slate-500">This duel is pending.</p>;
  }

  if (duel.status === "declined") {
    return <p className="text-sm text-slate-500">This duel was declined.</p>;
  }

  if (duel.status === "completed") {
    const youAreChallenger = side === "challenger";
    const youWon = youAreChallenger
      ? duel.winner === "student"
      : duel.winner === "opponent";
    const theyWon = youAreChallenger
      ? duel.winner === "opponent"
      : duel.winner === "student";
    const tie = duel.winner === "tie";

    const yourScore =
      side === "challenger"
        ? (duel.student_score ?? 0)
        : (duel.opponent_score ?? 0);
    const theirScore =
      side === "challenger"
        ? (duel.opponent_score ?? 0)
        : (duel.student_score ?? 0);

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p>
            <span className="font-medium text-slate-800">You:</span>{" "}
            {yourScore} / {duel.questions.length}
          </p>
          <p>
            <span className="font-medium text-slate-800">Them:</span>{" "}
            {theirScore} / {duel.questions.length}
          </p>
          <p className="mt-2">
            <span className="font-medium text-slate-800">Result:</span>{" "}
            {tie
              ? "Tie."
              : youWon
                ? "You won."
                : theyWon
                  ? "They won."
                  : "—"}
          </p>
        </div>
        <ol className="space-y-4">
          {duel.questions.map((q, i) => {
            const full = duel.fullQuestions?.[i];
            const correct = full?.correctIndex;
            return (
              <li key={i} className="text-sm border border-slate-100 rounded-md p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {kindLabel(q.type)}
                </p>
                <p className="text-slate-800 mt-1">{q.prompt}</p>
                <ul className="mt-2 space-y-1">
                  {q.choices.map((c, j) => (
                    <li
                      key={j}
                      className={
                        correct === j
                          ? "text-emerald-700 font-medium"
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
      </div>
    );
  }

  if (waitingOther) {
    return (
      <p className="text-sm text-slate-600">
        Answers recorded. Waiting for the other participant to finish…
      </p>
    );
  }

  if (submitted) {
    return (
      <p className="text-sm text-slate-500">
        You already submitted answers for this duel.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {duel.questions.map((q, qi) => (
        <div
          key={qi}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {kindLabel(q.type)} · Question {qi + 1}
          </p>
          <p className="text-sm font-medium text-slate-900 mt-1">{q.prompt}</p>
          <div className="mt-3 space-y-2">
            {q.choices.map((c, ci) => (
              <label
                key={ci}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
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
      <Button type="button" disabled={loading} onClick={() => void handleSubmit()}>
        {loading ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  );
}
