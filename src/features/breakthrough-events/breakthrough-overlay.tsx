"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BreakthroughCelebration } from "@/features/breakthrough-events/types";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { buildBreakthroughShareTweet } from "@/features/breakthrough-events/detect-pure";
import { markBreakthroughShared } from "@/features/breakthrough-events/reads";
import { Button } from "@/shared/ui/button";

const MENTRIXER_GOLD = "#D4A017";

type Props = {
  celebration: BreakthroughCelebration;
  onDismiss: () => void;
  onStartNextQuest?: () => void;
};

export function BreakthroughCelebrationOverlay({
  celebration,
  onDismiss,
  onStartNextQuest,
}: Props) {
  const [phase, setPhase] = useState<"celebrate" | "share">("celebrate");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("share"), 3000);
    return () => window.clearTimeout(t);
  }, []);

  const tweetText = buildBreakthroughShareTweet({
    concept: celebration.concept,
    before: celebration.accuracyBefore,
    after: celebration.accuracyAfter,
    shareUrl: celebration.shareUrl,
  });

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(celebration.shareUrl);
      setCopied(true);
      void markBreakthroughShared(celebration.eventId);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [celebration.eventId, celebration.shareUrl]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070d1a]/95 px-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_45%,#111827_100%)] p-8 text-center shadow-2xl"
          initial={{ scale: 0.92, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{ borderColor: `${MENTRIXER_GOLD}66`, backgroundColor: `${MENTRIXER_GOLD}18` }}
          >
            <MentrixaVocabIcon name="breakthrough" size={28} surface="light" title="Breakthrough" />
          </div>

          {phase === "celebrate" ? (
            <div className="space-y-3">
              <p
                className="text-[11px] font-black uppercase tracking-[0.35em]"
                style={{ color: MENTRIXER_GOLD }}
              >
                Breakthrough
              </p>
              <h2 className="text-2xl font-black italic text-white sm:text-3xl">
                {celebration.concept}
              </h2>
              <p className="text-lg font-bold tabular-nums text-indigo-100">
                {Math.round(celebration.accuracyBefore)}% → {Math.round(celebration.accuracyAfter)}%
              </p>
              <p className="text-sm font-medium text-violet-200">Your rank is moving.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-slate-200">
                You broke through <span className="font-bold text-white">{celebration.concept}</span>.
                {celebration.nextConcept ? (
                  <>
                    {" "}
                    Your next Quest:{" "}
                    <span className="font-bold text-indigo-200">{celebration.nextConcept}</span>.
                  </>
                ) : null}
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  onClick={() => void copyLink()}
                  className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {copied ? "Link copied" : "Copy link"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="rounded-xl border-indigo-400/40 bg-transparent text-indigo-100 hover:bg-white/5"
                >
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Share on X
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="rounded-xl border-indigo-400/40 bg-transparent text-indigo-100 hover:bg-white/5"
                >
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(celebration.shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                </Button>
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
                {celebration.nextConcept && onStartNextQuest ? (
                  <Button
                    type="button"
                    onClick={onStartNextQuest}
                    className="rounded-xl font-bold"
                    style={{ backgroundColor: MENTRIXER_GOLD, color: "#0f172a" }}
                  >
                    Start next Quest
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onDismiss}
                  className="rounded-xl text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
