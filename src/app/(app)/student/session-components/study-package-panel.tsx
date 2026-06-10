"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { getSessionPackage } from "@/features/studio-ai/studio-packages";
import type { SessionAiPackage } from "@/shared/types/database";

type Phase = "loading" | "ready" | "empty" | "withdrawn" | "error";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  },
};

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i += 3;
      if (i > text.length) clearInterval(timer);
    }, 10);
    return () => clearInterval(timer);
  }, [text]);

  return <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{displayedText}</p>;
}

export function StudyPackagePanel({
  sessionId,
  initialPackage,
  onQuestClick,
}: {
  sessionId: string;
  initialPackage: SessionAiPackage | null;
  onQuestClick: (prompt: string) => void;
}) {
  const [packageData, setPackageData] = useState<SessionAiPackage | null>(initialPackage);
  const [phase, setPhase] = useState<Phase>(() =>
    initialPackage?.package_published_at ? "ready" : "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const loadPackage = useCallback(() => {
    setPhase("loading");
    setErrorMessage(null);
    void getSessionPackage(sessionId).then((result) => {
      if ("error" in result) {
        setPhase("error");
        setErrorMessage(result.error);
        setPackageData(null);
        return;
      }
      if ("studioPackageWithdrawn" in result && result.studioPackageWithdrawn) {
        setPackageData(null);
        setPhase("withdrawn");
        return;
      }
      const pkg = result.package;
      // If student (which this panel is for), pkg will be null if not published yet due to server-side filter
      if (!pkg || !pkg.package_published_at) {
        setPackageData(null);
        setPhase("empty");
      } else {
        setPackageData(pkg);
        setPhase("ready");
      }
    });
  }, [sessionId]);

  useEffect(() => {
    if (initialPackage) {
      setPackageData(initialPackage);
      setPhase("ready");
      return;
    }
    loadPackage();
  }, [sessionId, initialPackage, loadPackage]);

  const toggleCard = (index: number) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };


  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <Image src="/images/pending.webp" alt="Loading" width={32} height={32} />
        </motion.div>
        <p className="text-sm font-medium text-slate-600">Retrieving your Studio insights...</p>
      </div>
    );
  }


  if (phase === "error") {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-100">
        <p className="text-sm text-red-700 mb-4 font-medium">{errorMessage ?? "Could not load package."}</p>
        <div className="flex gap-3">
          <Button type="button" size="sm" variant="outline" className="bg-white border-red-200 text-red-700 hover:bg-red-50" onClick={() => loadPackage()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "withdrawn") {
    return (
      <p className="text-sm text-slate-500 text-center py-4">
        Study package is no longer available for this session.
      </p>
    );
  }

  if (phase === "empty") {
    return (
      <div className="p-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
          <Image src="/images/pending.webp" alt="Pending" width={32} height={32} className="opacity-50" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Study Package Pending</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
          Your Guide is currently preparing your personalized study suite. Check back soon for your flashcards, exercises, and insights.
        </p>
      </div>
    );
  }

  if (!packageData) return null;

  const flashcards = packageData.flashcards ?? [];
  const quests = packageData.followup_quests ?? [];
  const keyPoints = packageData.key_points ?? [];
  const practiceExercises = packageData.practice_exercises ?? [];
  const followTopics = packageData.follow_up_topics ?? [];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 pt-4"
    >
      {/* Session Summary */}
      {packageData.summary?.trim() && (
        <motion.section variants={itemVariants} className="relative group">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-mentrixa-500 to-transparent rounded-full opacity-40" />
          <div className="flex items-center gap-2 mb-3">
            <Image src="/images/book.webp" alt="Summary" width={16} height={16} />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Session summary
            </h4>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/80 hover:bg-white transition-colors duration-300">
            <TypewriterText text={packageData.summary} />
          </div>
        </motion.section>
      )}

      {/* Recommended Next Steps */}
      {keyPoints.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <Image src="/images/package.webp" alt="Next Steps" width={16} height={16} />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recommended next steps
            </h4>
          </div>
          <div className="grid gap-3">
            {keyPoints.map((point, i) => (
              <motion.div 
                key={i}
                whileHover={{ x: 4 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/50 text-slate-800 text-sm"
              >
                <Image src="/images/checks.webp" alt="Check" width={14} height={14} className="mt-0.5 shrink-0" />
                <span>{point}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Practice Exercises */}
      {practiceExercises.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <Image src="/icons/guide.svg" alt="Guide" width={16} height={16} />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Practice exercises
            </h4>
          </div>
          <div className="grid gap-4">
            {practiceExercises.map((ex, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -4, scale: 1.01 }}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Image src="/images/quest.webp" alt="Quest" width={48} height={48} />
                </div>
                <div className="relative">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold uppercase mb-3">
                    Exercise {i + 1}
                  </span>
                  <h5 className="text-base font-bold text-slate-900 mb-2">{ex.title}</h5>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{ex.prompt}</p>
                  {ex.hint && (
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-start gap-2 text-xs text-slate-500">
                      <Image src="/images/live.webp" alt="Hint" width={14} height={14} className="mt-0.5 shrink-0" />
                      <p><span className="font-bold text-slate-600">Pro-tip: </span>{ex.hint}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Flashcards */}
      {flashcards.length > 0 && (
        <motion.section variants={itemVariants} className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image src="/images/xp.webp" alt="Flashcards" width={16} height={16} />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Recall Flashcards
              </h4>
            </div>
            <span className="text-[10px] font-medium text-slate-400">TAP TO FLIP</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flashcards.map((card, index) => {
              const isFlipped = !!flippedCards[index];
              return (
                <div key={index} className="perspective-1000 h-40">
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => toggleCard(index)}
                    className="relative w-full h-full cursor-pointer preserve-3d"
                  >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden rounded-2xl border-2 border-slate-100 bg-white p-5 flex flex-col justify-center shadow-sm hover:border-mentrixa-300 transition-colors">
                      <span className="absolute top-4 left-4 text-[10px] font-bold text-slate-300 uppercase">Question</span>
                      <p className="text-sm font-semibold text-slate-800 text-center">{card.q}</p>
                    </div>
                    {/* Back */}
                    <div 
                      className="absolute inset-0 backface-hidden rounded-2xl border-2 border-mentrixa-200 bg-mentrixa-50 p-5 flex flex-col justify-center shadow-md"
                      style={{ transform: "rotateY(180deg)" }}
                    >
                      <span className="absolute top-4 left-4 text-[10px] font-bold text-mentrixa-400 uppercase">Answer</span>
                      <p className="text-sm font-medium text-mentrixa-900 text-center leading-relaxed">
                        {card.a}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Quest Practice */}
      {quests.length > 0 && (
        <motion.section variants={itemVariants} className="pt-4">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Image src="/images/quest.webp" alt="Quest BG" width={96} height={96} />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-mentrixa-500 flex items-center justify-center overflow-hidden">
                  <Image src="/images/quest.webp" alt="Quest" width={16} height={16} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-mentrixa-200">
                  Quest practice
                </h4>
              </div>
              <div className="space-y-3">
                {quests.map((quest, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ x: 6 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuestClick(quest.prompt)}
                    className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-mentrixa-400 group-hover:scale-150 transition-transform" />
                      <span className="text-sm font-medium text-slate-100 leading-tight">
                        {quest.prompt}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {quest.difficulty && (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-bold uppercase text-slate-400">
                          {quest.difficulty}
                        </span>
                      )}
                      <Image src="/images/package.webp" alt="Arrow" width={12} height={12} className="opacity-50 group-hover:opacity-100 transition-opacity invert" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Follow-up Topics */}
      {followTopics.length > 0 && (
        <motion.section variants={itemVariants} className="pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Image src="/images/package.webp" alt="Topic" width={12} height={12} />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Further exploration
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {followTopics.map((t, i) => (
              <span 
                key={i} 
                className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 hover:bg-mentrixa-50 hover:border-mentrixa-200 transition-colors"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
