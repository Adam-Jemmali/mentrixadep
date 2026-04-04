"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  joinDuelQueue,
  leaveDuelQueue,
  pollDuelQueue,
  createAiDuelFromQueue,
} from "@/app/actions/duel";
import { DUEL_AI_QUEUE_WAIT_MS } from "@/lib/duel-constants";
import { Button } from "@/components/ui/button";
import { DivisionPickerCards } from "@/components/student/division-picker-cards";

interface Props {
  divisions: { key: string; name: string; description: string | null }[];
  /** Syncs with Division arena “home” focus when set */
  preferredDivisionKey: string | null;
  initialQueueDivision: string | null;
}

function resolveInitialDivisionKey(
  divisions: { key: string }[],
  queueDivision: string | null,
  preferred: string | null
): string {
  const keys = new Set(divisions.map((d) => d.key));
  if (queueDivision && keys.has(queueDivision)) return queueDivision;
  if (preferred && keys.has(preferred)) return preferred;
  return divisions[0]?.key ?? "";
}

export function DuelHub({
  divisions,
  preferredDivisionKey,
  initialQueueDivision,
}: Props) {
  const router = useRouter();

  const initialKey = useMemo(
    () =>
      resolveInitialDivisionKey(
        divisions,
        initialQueueDivision,
        preferredDivisionKey
      ),
    [divisions, initialQueueDivision, preferredDivisionKey]
  );

  const [divisionKey, setDivisionKey] = useState(initialKey);
  const [queuePhase, setQueuePhase] = useState<"idle" | "waiting">(
    initialQueueDivision ? "waiting" : "idle"
  );
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const activeDivisionLabel =
    divisions.find((d) => d.key === divisionKey)?.name ?? divisionKey;

  useEffect(() => {
    if (queuePhase !== "waiting" || !divisionKey) return;
    const tick = async () => {
      const p = await pollDuelQueue(divisionKey);
      if (p?.state === "matched" && p.duelId) {
        router.push(`/student/duel/${p.duelId}`);
      }
    };
    const id = setInterval(() => void tick(), 2000);
    void tick();
    return () => clearInterval(id);
  }, [queuePhase, divisionKey, router]);

  /** No human in ~60s → AI sparring opponent (same question set) */
  useEffect(() => {
    if (queuePhase !== "waiting" || !divisionKey) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        const p = await pollDuelQueue(divisionKey);
        if (p?.state === "matched" && p.duelId) {
          router.push(`/student/duel/${p.duelId}`);
          return;
        }
        const r = await createAiDuelFromQueue(divisionKey);
        if (!cancelled && r.success) {
          router.push(`/student/duel/${r.duelId}`);
        }
      })();
    }, DUEL_AI_QUEUE_WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [queuePhase, divisionKey, router]);

  async function findMatch() {
    if (!divisionKey) return;
    setQueueLoading(true);
    setQueueError(null);
    try {
      const r = await joinDuelQueue(divisionKey);
      if (!r || typeof r !== "object" || !("success" in r)) {
        setQueueError("Matchmaking failed. Please try again.");
        return;
      }
      if (!r.success) {
        setQueueError(r.error);
        return;
      }
      if (r.state === "matched" && "duelId" in r && r.duelId) {
        router.push(`/student/duel/${r.duelId}`);
        return;
      }
      setQueuePhase("waiting");
    } catch {
      setQueueError("Matchmaking failed. Please try again.");
    } finally {
      setQueueLoading(false);
    }
  }

  async function cancelQueue() {
    setQueueLoading(true);
    await leaveDuelQueue();
    setQueueLoading(false);
    setQueuePhase("idle");
    router.refresh();
  }

  if (divisions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No subject divisions are available yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Find a match
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Same subject queue as the Division arena-pick where you want to
            fight. Both players need duel opt-in in Settings.
          </p>
        </div>
        {queuePhase === "waiting" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Searching in </span>
            <span className="text-slate-800">{activeDivisionLabel}</span>
            <span className="text-slate-500">
              {" "}
              - we match instantly with anyone queued in this subject. If no one joins in about a
              minute, you will face a sparring AI with the same questions.
            </span>
          </div>
        ) : (
          <DivisionPickerCards
            mode="select"
            divisions={divisions}
            selectedKey={divisionKey}
            onSelect={setDivisionKey}
            compact
          />
        )}
        {queueError && (
          <p className="text-sm text-red-600">{queueError}</p>
        )}
        {queuePhase === "idle" ? (
          <Button
            type="button"
            disabled={queueLoading || !divisionKey}
            onClick={() => void findMatch()}
          >
            {queueLoading ? "Searching..." : "Find opponent"}
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <p className="text-sm text-slate-600">
              Looking for an opponent in this division...
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={queueLoading}
              onClick={() => void cancelQueue()}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
