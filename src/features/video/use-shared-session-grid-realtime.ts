"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/shared/integrations/supabase/client";
import type { MasteryGridData, MasteryNodeState } from "@/features/mastery-grid/types";
import {
  applyKnowledgeRowToGrid,
  parseSharedSessionBroadcast,
  SHARED_SESSION_BROADCAST,
  type SharedSessionBloomEvent,
  type SharedSessionBroadcastEvent,
  type SharedSessionGridMode,
  type SharedSessionGuideNoteEvent,
} from "@/features/video/shared-session-grid-pure";

type KnowledgeRowPayload = {
  new?: {
    skill_node_id?: string;
    attempts?: number;
    correct?: number;
  } | null;
};

export type SharedSessionGridRealtimeState = {
  grid: MasteryGridData;
  highlightTransition: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  } | null;
  flaggedNodeIds: Set<string>;
  guideNoteToast: SharedSessionGuideNoteEvent | null;
  practiceAssignedToast: { nodeName: string; questId: string } | null;
  pulsingImpactNodeId: string | null;
};

export function useSharedSessionGridRealtime({
  mode,
  studentId,
  initialGrid,
  channel,
  guideName,
  onBloomElement,
}: {
  mode: SharedSessionGridMode;
  studentId: string;
  initialGrid: MasteryGridData;
  channel: RealtimeChannel | null;
  guideName: string;
  onBloomElement?: (nodeId: string) => void;
}) {
  const [grid, setGrid] = useState(initialGrid);
  const [highlightTransition, setHighlightTransition] = useState<
    SharedSessionGridRealtimeState["highlightTransition"]
  >(null);
  const [flaggedNodeIds, setFlaggedNodeIds] = useState<Set<string>>(() => new Set());
  const [guideNoteToast, setGuideNoteToast] = useState<SharedSessionGuideNoteEvent | null>(null);
  const [practiceAssignedToast, setPracticeAssignedToast] = useState<{
    nodeName: string;
    questId: string;
  } | null>(null);
  const [pulsingImpactNodeId, setPulsingImpactNodeId] = useState<string | null>(null);

  const gridRef = useRef(grid);
  gridRef.current = grid;

  const verifiedCacheRef = useRef<Map<string, { isCorrect: boolean }>>(new Map());

  useEffect(() => {
    setGrid(initialGrid);
  }, [initialGrid]);

  const applyBloom = useCallback(
    (bloom: SharedSessionBloomEvent, broadcast: boolean) => {
      setHighlightTransition({
        nodeId: bloom.nodeId,
        fromState: bloom.fromState,
        toState: bloom.toState,
      });
      onBloomElement?.(bloom.nodeId);

      if (mode === "guide") {
        setPulsingImpactNodeId(bloom.nodeId);
        window.setTimeout(() => setPulsingImpactNodeId(null), 650);
      }

      if (broadcast && channel) {
        void channel.send({
          type: "broadcast",
          event: SHARED_SESSION_BROADCAST.bloom,
          payload: bloom,
        });
        if (mode === "student") {
          void channel.send({
            type: "broadcast",
            event: SHARED_SESSION_BROADCAST.pulse,
            payload: { nodeId: bloom.nodeId },
          });
        }
      }

      window.setTimeout(() => setHighlightTransition(null), 900);
    },
    [channel, mode, onBloomElement],
  );

  const handleBroadcast = useCallback(
    (event: SharedSessionBroadcastEvent) => {
      switch (event.type) {
        case "grid-bloom":
          applyBloom(event.payload, false);
          break;
        case "guide-note":
          if (mode === "student") {
            setGuideNoteToast(event.payload);
            window.setTimeout(() => setGuideNoteToast(null), 6000);
          }
          break;
        case "flag-node":
          setFlaggedNodeIds((prev) => {
            const next = new Set(prev);
            if (event.payload.flagged) next.add(event.payload.nodeId);
            else next.delete(event.payload.nodeId);
            return next;
          });
          break;
        case "practice-assigned":
          if (mode === "student") {
            setPracticeAssignedToast({
              nodeName: event.payload.nodeName,
              questId: event.payload.questId,
            });
            window.setTimeout(() => setPracticeAssignedToast(null), 7000);
          }
          break;
        case "impact-pulse":
          if (mode === "guide") {
            setPulsingImpactNodeId(event.payload.nodeId);
            window.setTimeout(() => setPulsingImpactNodeId(null), 650);
          }
          break;
        default:
          break;
      }
    },
    [applyBloom, mode],
  );

  useEffect(() => {
    if (!channel) return;

    const events = Object.values(SHARED_SESSION_BROADCAST);
    const handlers = events.map((eventName) => {
      const handler = (message: { payload?: unknown }) => {
        const parsed = parseSharedSessionBroadcast(eventName, message.payload);
        if (parsed) handleBroadcast(parsed);
      };
      channel.on("broadcast", { event: eventName }, handler);
      return handler;
    });

    return () => {
      void handlers;
    };
  }, [channel, handleBroadcast]);

  useEffect(() => {
    if (mode !== "student" || !studentId) return;

    const supabase = createClient();
    const verifiedCache = verifiedCacheRef.current;

    void supabase
      .from("verified_first_attempts")
      .select("skill_node_id, is_correct")
      .eq("user_id", studentId)
      .then(({ data }: { data: { skill_node_id: string; is_correct: boolean }[] | null }) => {
        for (const row of data ?? []) {
          verifiedCache.set(String(row.skill_node_id), {
            isCorrect: Boolean(row.is_correct),
          });
        }
      });

    const sub = supabase
      .channel(`shared-grid-skn-${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "student_knowledge_nodes",
          filter: `user_id=eq.${studentId}`,
        },
        (payload: KnowledgeRowPayload) => {
          const row = payload.new;
          if (!row?.skill_node_id) return;

          const attempts = Number(row.attempts ?? 0);
          const correct = Number(row.correct ?? 0);
          const { grid: nextGrid, bloom } = applyKnowledgeRowToGrid(
            gridRef.current,
            {
              skill_node_id: String(row.skill_node_id),
              attempts,
              correct,
            },
            verifiedCache,
          );

          if (!bloom) return;
          setGrid(nextGrid);
          applyBloom(bloom, true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [applyBloom, mode, studentId]);

  const broadcastFlag = useCallback(
    (nodeId: string, flagged: boolean) => {
      setFlaggedNodeIds((prev) => {
        const next = new Set(prev);
        if (flagged) next.add(nodeId);
        else next.delete(nodeId);
        return next;
      });
      void channel?.send({
        type: "broadcast",
        event: SHARED_SESSION_BROADCAST.flag,
        payload: { nodeId, flagged },
      });
    },
    [channel],
  );

  const broadcastNote = useCallback(
    (payload: SharedSessionGuideNoteEvent) => {
      void channel?.send({
        type: "broadcast",
        event: SHARED_SESSION_BROADCAST.note,
        payload,
      });
      if (mode === "guide") {
        setGuideNoteToast(payload);
        window.setTimeout(() => setGuideNoteToast(null), 4000);
      }
    },
    [channel, mode],
  );

  const broadcastPracticeAssigned = useCallback(
    (payload: { nodeId: string; nodeName: string; questId: string }) => {
      void channel?.send({
        type: "broadcast",
        event: SHARED_SESSION_BROADCAST.practice,
        payload,
      });
    },
    [channel],
  );

  return {
    grid,
    highlightTransition,
    flaggedNodeIds,
    guideNoteToast,
    practiceAssignedToast,
    pulsingImpactNodeId,
    broadcastFlag,
    broadcastNote,
    broadcastPracticeAssigned,
    guideName,
  };
}
