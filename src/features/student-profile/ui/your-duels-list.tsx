"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { DuelRowActions } from "@/features/student-profile/ui/duel-row-actions";

export type YourDuelListRow = {
  id: string;
  student_id: string;
  opponent_student_id: string | null;
  division_key: string;
  status: string;
  is_ai_opponent: boolean;
};

type Props = {
  initialRows: YourDuelListRow[];
  myId: string;
  nameById: Record<string, string>;
};

export function YourDuelsList({ initialRows, myId, nameById }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const handleRemoved = useCallback((duelId: string) => {
    setRemoveError(null);
    setRows((prev) => prev.filter((r) => r.id !== duelId));
  }, []);

  const handleRemoveError = useCallback((message: string) => {
    setRemoveError(message);
  }, []);

  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-zinc-400">
        No duels yet. Find a match above (your opponent must opt in under Settings).
      </p>
    );
  }

  return (
    <>
      {removeError ? (
        <p className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {removeError}
        </p>
      ) : null}
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const otherId = r.student_id === myId ? r.opponent_student_id : r.student_id;
          const label =
            r.is_ai_opponent && r.student_id === myId
              ? "Sparring Quest"
              : otherId
                ? (nameById[otherId] ?? "Learner")
                : "Learner";
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">vs {label}</p>
                <p className="font-mono text-xs text-zinc-400">{r.division_key}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
                <span className="text-xs capitalize text-zinc-500">{r.status}</span>
                <DuelRowActions
                  duelId={r.id}
                  status={r.status}
                  myId={myId}
                  studentId={r.student_id}
                  opponentStudentId={r.opponent_student_id}
                  isAiOpponent={r.is_ai_opponent}
                  onRemoved={handleRemoved}
                  onError={handleRemoveError}
                />
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/student/duel/${r.id}`}>Open</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
