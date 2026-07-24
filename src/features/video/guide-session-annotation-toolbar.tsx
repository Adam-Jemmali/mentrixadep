"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Flag, MessageSquarePlus, SendHorizonal } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { KokonutGlass } from "@/shared/ui/kokonut-glass";
import { Button } from "@/shared/ui/button";
import { assignSessionPracticeForNode } from "@/features/video/shared-session-grid-actions";
import type { MasteryGridNode } from "@/features/mastery-grid/types";
import { animate } from "@/shared/animation/anime";
import { motion, AnimatePresence, useReducedMotion } from "@/shared/animation/motion";

export function GuideSessionAnnotationToolbar({
  node,
  anchorRect,
  sessionId,
  studentId,
  guideName,
  isFlagged,
  impactScore,
  impactPulsing,
  onFlag,
  onNoteSent,
  onPracticeAssigned,
  onClose,
}: {
  node: MasteryGridNode;
  anchorRect: DOMRect;
  sessionId: string;
  studentId: string;
  guideName: string;
  isFlagged: boolean;
  impactScore?: number;
  impactPulsing?: boolean;
  onFlag: (nodeId: string, flagged: boolean) => void;
  onNoteSent: (payload: {
    nodeId: string;
    nodeName: string;
    note: string;
    guideName: string;
  }) => void;
  onPracticeAssigned: (payload: {
    nodeId: string;
    nodeName: string;
    questId: string;
  }) => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLSpanElement>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!impactPulsing || reduceMotion || !impactRef.current) return;
    void animate(impactRef.current, {
      opacity: [1, 0.4, 1],
      duration: 600,
      ease: "inOutQuad",
    });
  }, [impactPulsing, reduceMotion]);

  const top = Math.max(8, anchorRect.top - 56);
  const left = Math.min(
    typeof window !== "undefined" ? window.innerWidth - 320 : anchorRect.left,
    Math.max(8, anchorRect.left + anchorRect.width / 2 - 150),
  );

  const sendNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    onNoteSent({
      nodeId: node.id,
      nodeName: node.nodeName,
      note: trimmed,
      guideName,
    });
    setNote("");
    setNoteOpen(false);
  };

  const assignQuestion = () => {
    setError(null);
    startTransition(async () => {
      const res = await assignSessionPracticeForNode({
        sessionId,
        studentId,
        skillNodeId: node.id,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      onPracticeAssigned({
        nodeId: res.nodeId,
        nodeName: res.nodeName,
        questId: res.questId,
      });
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="pointer-events-auto fixed z-[80]"
        style={{ top, left, width: 300 }}
        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        onMouseLeave={onClose}
      >
        <KokonutGlass className="border-[var(--mx-violet)]/25 bg-[var(--mx-navy-2)]/95 shadow-[0_12px_40px_-8px_rgba(124,58,237,0.45)]">
          <div className="flex h-12 items-center gap-1 px-2">
            <ToolbarAction
              label="Flag this node"
              active={isFlagged}
              onClick={() => onFlag(node.id, !isFlagged)}
              icon={<Flag className="h-4 w-4 text-[var(--mx-violet)]" strokeWidth={2.25} />}
            />
            <ToolbarAction
              label="Add note"
              active={noteOpen}
              onClick={() => setNoteOpen((v) => !v)}
              icon={<MessageSquarePlus className="h-4 w-4 text-[var(--mx-violet)]" strokeWidth={2.25} />}
            />
            <ToolbarAction
              label="Assign next question"
              disabled={pending}
              onClick={() => assignQuestion()}
              icon={
                <MentrixaVocabIcon
                  name="practice-pack"
                  size={16}
                  surface="dark"
                  className="text-[var(--mx-violet)]"
                  title="Assign next question"
                />
              }
            />
            {impactScore != null && impactScore > 0 ? (
              <span
                ref={impactRef}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--mx-violet)]/30 bg-[var(--mx-violet)]/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#C4B5FD]"
                title="Guide Impact on this node"
              >
                <MentrixaVocabIcon name="guide-impact-receipt" size={12} surface="dark" title="Impact" />
                {Math.round(impactScore)}
              </span>
            ) : null}
          </div>

          <AnimatePresence initial={false}>
            {noteOpen ? (
              <motion.div
                key="note"
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-white/8 px-2 pb-2 pt-1"
              >
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={`Note for ${node.nodeName}`}
                  className="w-full resize-none rounded-md border border-white/10 bg-[var(--mx-navy)]/80 px-2 py-1.5 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[var(--mx-violet)]/50"
                />
                <div className="mt-1 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-[10px] text-[#C4B5FD] hover:bg-[var(--mx-violet)]/15 hover:text-white"
                    onClick={sendNote}
                    disabled={!note.trim()}
                  >
                    <SendHorizonal className="h-3 w-3" />
                    Send note
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {error ? (
            <p className="border-t border-red-500/20 px-2 py-1 text-[10px] text-red-300">{error}</p>
          ) : null}
        </KokonutGlass>
      </motion.div>
    </AnimatePresence>
  );
}

function ToolbarAction({
  label,
  icon,
  onClick,
  active,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md border text-[10px] font-semibold transition-colors",
        active
          ? "border-[var(--mx-violet)]/50 bg-[var(--mx-violet)]/20 text-white"
          : "border-white/8 bg-white/5 text-white/80 hover:border-[var(--mx-violet)]/40 hover:bg-[var(--mx-violet)]/10",
        disabled && "cursor-wait opacity-60",
      )}
    >
      {icon}
      <span className="hidden min-[380px]:inline">{label}</span>
    </button>
  );
}
