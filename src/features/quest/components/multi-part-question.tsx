"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { QuestStimulusBlock } from "@/features/quest/components/quest-stimulus-block";
import { formatMultiPartXpLine } from "@/features/quest/multi-part-pure";
import { QUEST_RUN_SURFACE, type QuestSurface } from "@/features/quest/ui/quest-surface";
import type { QuestStimulus } from "@/features/quest/quest-stimulus-pure";
import { cn } from "@/shared/core/utils";

export type MultiPartPublicPart = {
  partKey: string;
  prompt: string;
  itemFormat: "mcq" | "free_response";
  options?: string[];
  state: "locked" | "active" | "done";
  correct?: boolean;
  carriedForward?: boolean;
  studentAnswer?: string;
  revealedAnswer?: string;
  carryForwardNote?: string;
};

type Props = {
  stem: string;
  stimulus?: QuestStimulus[] | null;
  parts: MultiPartPublicPart[];
  partsCorrect: number;
  partsTotal: number;
  xpEarned: number;
  finished: boolean;
  busy?: boolean;
  surface?: QuestSurface;
  onSubmitPart: (input: {
    partIndex: number;
    selectedIndex?: number;
    freeResponse?: string;
  }) => Promise<void>;
  onContinue?: () => void;
};

export function MultiPartQuestion({
  stem,
  stimulus,
  parts,
  partsCorrect,
  partsTotal,
  xpEarned,
  finished,
  busy = false,
  surface = QUEST_RUN_SURFACE,
  onSubmitPart,
  onContinue,
}: Props) {
  const isDark = surface === "dark";
  const activeIndex = parts.findIndex((part) => part.state === "active");
  const active = activeIndex >= 0 ? parts[activeIndex] : null;
  const [picked, setPicked] = useState<number | null>(null);
  const [written, setWritten] = useState("");

  const submitActive = async () => {
    if (activeIndex < 0 || !active) return;
    await onSubmitPart({
      partIndex: activeIndex,
      selectedIndex: active.itemFormat === "mcq" ? (picked ?? undefined) : undefined,
      freeResponse: active.itemFormat === "free_response" ? written : undefined,
    });
    setPicked(null);
    setWritten("");
  };

  return (
    <div className="space-y-4">
      <QuestStimulusBlock stimulus={stimulus} variant={surface} />
      <div className={cn("text-[17px] leading-[1.6]", isDark ? "text-white" : "text-[var(--mx-navy)]")}>
        <PromptWithMath text={stem} variant={surface} highlightKeyTerms />
      </div>

      <p className={cn("font-mono text-xs tabular-nums", isDark ? "text-white/60" : "text-[#475569]")}>
        {formatMultiPartXpLine(partsCorrect, partsTotal, xpEarned)}
      </p>

      <div className="space-y-3">
        {parts.map((part) => {
          const locked = part.state === "locked";
          const activePart = part.state === "active";
          return (
            <section
              key={part.partKey}
              className={cn(
                "rounded-xl border p-4",
                isDark
                  ? [
                      locked && "border-white/10 bg-[var(--mx-navy-2)]/40 opacity-60",
                      activePart && "border-[var(--mx-violet)]/45 bg-[var(--mx-navy-2)]",
                      part.state === "done" && "border-white/15 bg-[var(--mx-navy-2)]/80",
                    ]
                  : [
                      locked && "border-[var(--mx-rule)] bg-[#F8FAFC] opacity-60",
                      activePart && "border-[var(--mx-violet)]/45 bg-white",
                      part.state === "done" && "border-[#CBD5E1] bg-white",
                    ],
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
                  Part {part.partKey}
                </p>
                {locked ? (
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-white/45" : "text-[#94A3B8]")}>
                    Locked
                  </span>
                ) : null}
                {part.state === "done" ? (
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider",
                      part.correct ? (isDark ? "text-emerald-300" : "text-emerald-700") : "text-[var(--mx-violet)]",
                    )}
                  >
                    {part.correct ? "Correct" : "Carried"}
                  </span>
                ) : null}
              </div>

              <div className={cn("mt-2 text-sm", isDark ? "text-white" : undefined)}>
                <PromptWithMath text={part.prompt} variant={surface} />
              </div>

              {part.state === "done" ? (
                <div className={cn("mt-3 space-y-1 text-sm", isDark ? "text-white/80" : "text-[#334155]")}>
                  {part.studentAnswer ? (
                    <p>
                      Your answer: <PromptWithMath text={part.studentAnswer} variant={surface} />
                    </p>
                  ) : null}
                  {part.carryForwardNote ? (
                    <p className="text-[var(--mx-violet)]">{part.carryForwardNote}</p>
                  ) : null}
                  {part.revealedAnswer ? (
                    <p>
                      Correct: <PromptWithMath text={part.revealedAnswer} variant={surface} />
                    </p>
                  ) : null}
                </div>
              ) : null}

              {activePart && part.itemFormat === "mcq" && part.options ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {part.options.map((option, i) => (
                    <button
                      key={`${part.partKey}-${i}`}
                      type="button"
                      disabled={busy}
                      onClick={() => setPicked(i)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-sm [&_.katex]:text-inherit",
                        isDark
                          ? picked === i
                            ? "border-[var(--mx-indigo)] bg-[var(--mx-indigo)]/20 ring-2 ring-[var(--mx-indigo)]/40 text-white"
                            : "border-white/20 bg-[var(--mx-navy-2)] text-white hover:border-[var(--mx-indigo)]"
                          : picked === i
                            ? "border-[var(--mx-indigo)] bg-violet-100 ring-2 ring-[var(--mx-indigo)]/40"
                            : "border-violet-300 bg-white hover:border-[var(--mx-indigo)]",
                      )}
                    >
                      <PromptWithMath text={option} variant={surface} />
                    </button>
                  ))}
                </div>
              ) : null}

              {activePart && part.itemFormat === "free_response" ? (
                <textarea
                  className={cn(
                    "mt-3 min-h-[96px] w-full rounded-xl border px-3 py-2 text-sm",
                    isDark
                      ? "border-white/15 bg-[var(--mx-navy-2)] text-white placeholder:text-white/40"
                      : "border-violet-300 bg-white text-[var(--mx-navy)]",
                  )}
                  placeholder="Your answer…"
                  value={written}
                  disabled={busy}
                  onChange={(e) => setWritten(e.target.value)}
                />
              ) : null}

              {activePart ? (
                <Button
                  className="mt-3"
                  disabled={
                    busy ||
                    (part.itemFormat === "mcq" ? picked == null : !written.trim())
                  }
                  onClick={() => void submitActive()}
                >
                  Submit part {part.partKey}
                </Button>
              ) : null}
            </section>
          );
        })}
      </div>

      {finished && onContinue ? (
        <Button type="button" onClick={onContinue} disabled={busy}>
          Next question
        </Button>
      ) : null}
    </div>
  );
}
