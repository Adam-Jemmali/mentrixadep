"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { gsap } from "gsap";
import { staggerIn } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  submitQuest,
  submitQuestAnswer,
  getCurrentUserXp,
  type QuestGoal,
  type QuestMode,
} from "@/app/actions/quest";
import { QuestIllustration } from "@/components/illustrations";

const RECENT_KEY = "mentrixa_quests";
const MAX_RECENT = 5;

const GOAL_OPTIONS: { value: QuestGoal; label: string; labelText: string }[] = [
  { value: "exam", label: "Exam prep", labelText: "Exam prep" },
  { value: "interview", label: "Interview prep", labelText: "Interview prep" },
  { value: "assignment", label: "Assignment help", labelText: "Assignment help" },
];

type QuestResponse = {
  questId: string;
  hints: string[];
  reasoning: string;
  solution: string;
  mode: QuestMode;
  goal: QuestGoal;
  variants?: { prompt: string }[];
};

type RecentItem = {
  text: string;
  payload?: QuestResponse;
  /** True after a correct submit — reopening from Recents is review-only. */
  completedLocally?: boolean;
};

export function QuestClassicWorkspace() {
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState("");
  const [goal, setGoal] = useState<QuestGoal>("exam");
  const [mode, setMode] = useState<QuestMode>("coach");
  const [isLoading, setIsLoading] = useState(false);

  const [currentQuest, setCurrentQuest] = useState<QuestResponse | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [reasoningShown, setReasoningShown] = useState(false);
  const [solutionShown, setSolutionShown] = useState(false);

  const [xpThisSession, setXpThisSession] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  const [recentQuests, setRecentQuests] = useState<RecentItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [lastXpAwarded, setLastXpAwarded] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const xpFillRef = useRef<HTMLDivElement | null>(null);

  // hydrate from URL
  useEffect(() => {
    const q = searchParams.get("prompt");
    if (q != null && q.trim()) setPrompt(decodeURIComponent(q.trim()));
  }, [searchParams]);

  // load recent
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const items: RecentItem[] = parsed.map((x: unknown) => {
        if (typeof x === "string") return { text: x };
        if (x && typeof x === "object" && "text" in x) {
          const o = x as Record<string, unknown>;
          return {
            text: String(o.text),
            payload: o.payload as QuestResponse | undefined,
            completedLocally: o.completedLocally === true,
          };
        }
        return { text: String(x) };
      });
      setRecentQuests(items.slice(0, MAX_RECENT));
    } catch {
      setRecentQuests([]);
    }
  }, []);

  // load XP
  useEffect(() => {
    (async () => {
      const result = await getCurrentUserXp();
      if (result && !("error" in result)) {
        setTotalXp(result.totalXp);
        setStreakDays(result.streakDays);
      }
    })();
  }, []);

  const addToRecent = (text: string, payload?: QuestResponse) => {
    if (!text.trim() || typeof window === "undefined") return;
    const item: RecentItem = { text: text.trim(), payload, completedLocally: false };
    setRecentQuests((prev) => {
      const next = [item, ...prev.filter((q) => q.text !== text.trim())].slice(0, MAX_RECENT);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const markRecentCompleted = (text: string) => {
    const t = text.trim();
    if (!t || typeof window === "undefined") return;
    setRecentQuests((prev) => {
      const next = prev.map((q) =>
        q.text.trim() === t ? { ...q, completedLocally: true } : q,
      );
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeFromRecent = (text: string) => {
    if (typeof window === "undefined") return;
    setRecentQuests((prev) => {
      const next = prev.filter((q) => q.text !== text);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const hints = useMemo(() => currentQuest?.hints ?? [], [currentQuest]);
  const totalHints = hints.length;
  const visibleHints = useMemo(() => hints.slice(0, hintsRevealed), [hints, hintsRevealed]);

  const handleSubmit = async (autoText?: string) => {
    // Read from textarea ref when clicking button to avoid stale state from batching
    const text = (autoText ?? textareaRef.current?.value ?? prompt).trim();
    if (!text) return;
    setSubmitError(null);
    setRecordError(null);
    setQuestCompleted(false);
    setLastXpAwarded(null);
    setIsLoading(true);
    setCurrentQuest(null);
    setHintsRevealed(0);
    setReasoningShown(false);
    setSolutionShown(false);

    const result = await submitQuest(text, goal, mode);
    setIsLoading(false);

    if ("error" in result && result.error) {
      const msg =
        typeof result.message === "string" && result.message.trim()
          ? result.message
          : "Something went wrong. Please try again.";
      setSubmitError(msg);
      setCurrentQuest(null);
      return;
    }

    const data = result as {
      questId: string;
      hints: string[];
      reasoning: string;
      solution: string;
      mode: QuestMode;
      variants?: { prompt: string }[];
    };

    if (!data.questId || !Array.isArray(data.hints) || data.hints.length === 0) {
      setSubmitError("Got an incomplete response. Please try again.");
      setCurrentQuest(null);
      return;
    }
    const payload: QuestResponse = {
      questId: data.questId,
      hints: data.hints,
      reasoning: data.reasoning,
      solution: data.solution,
      mode: data.mode,
      goal,
      variants: data.variants ?? [],
    };
    addToRecent(text, payload);
    setPrompt(text);
    setCurrentQuest(payload);
    setHintsRevealed(payload.hints.length > 0 ? 1 : 0);

    if (rightPaneRef.current) {
      rightPaneRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleRevealNextHint = () => {
    if (!currentQuest) return;
    if (hintsRevealed >= currentQuest.hints.length) return;
    const nextIndex = hintsRevealed + 1;
    setHintsRevealed(nextIndex);

    setTimeout(() => {
      if (!rightPaneRef.current) return;
      const node = rightPaneRef.current.querySelector<HTMLDivElement>(
        `[data-hint-index="${nextIndex - 1}"]`,
      );
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 10);
  };

  const handleSubmitAnswer = async () => {
    const answer = userAnswer.trim();
    if (!currentQuest || questCompleted || !answer) return;
    setRecordError(null);
    setAnswerFeedback(null);
    setSubmittingAnswer(true);
    try {
      const result = await submitQuestAnswer(
        currentQuest.questId,
        answer,
        currentQuest.goal ?? goal,
        currentQuest.mode,
      );
      if (!result) {
        setRecordError("Something went wrong. Please try again.");
        return;
      }
      if ("error" in result) {
        if (
          typeof result.message === "string" &&
          result.message.toLowerCase().includes("already finished")
        ) {
          markRecentCompleted(prompt);
          setQuestCompleted(true);
          setLastXpAwarded(null);
          setRecordError(null);
          return;
        }
        setRecordError(result.message);
        return;
      }
      if (result.correct) {
        setQuestCompleted(true);
        markRecentCompleted(prompt);
        setLastXpAwarded(result.xpAwarded ?? 0);
        setXpThisSession((s) => s + (result.xpAwarded ?? 0));
        setTotalXp(result.totalXp ?? totalXp);
        setStreakDays(result.streakDays ?? streakDays);
        setUserAnswer("");
        setAnswerFeedback(null);
      } else {
        setAnswerFeedback(result.feedback ?? "Not quite right. Review the hints and try again.");
      }
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const getAnswerPlaceholder = () => {
    const g = currentQuest?.goal ?? goal;
    const m = currentQuest?.mode ?? mode;
    if (g === "interview")
      return "Summarize your approach or key points (as you would in an interview)...";
    if (g === "assignment" && m === "exam")
      return "Show your work: solution, code, or proof...";
    if (g === "assignment")
      return "Paste your solution, code, or explain your steps...";
    if (m === "exam")
      return "Type your final answer...";
    return "Explain your solution or paste your answer...";
  };

  const handleAskAnother = () => {
    setCurrentQuest(null);
    setQuestCompleted(false);
    setLastXpAwarded(null);
    setHintsRevealed(0);
    setReasoningShown(false);
    setSolutionShown(false);
    setUserAnswer("");
    setAnswerFeedback(null);
    setRecordError(null);
    setSubmitError(null);
    setPrompt("");
    if (rightPaneRef.current) {
      rightPaneRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleRecentClick = (item: RecentItem) => {
    setPrompt(item.text);
    setRecordError(null);
    setUserAnswer("");
    setAnswerFeedback(null);
    if (item.payload) {
      setCurrentQuest(item.payload);
      setHintsRevealed(item.payload.hints.length);
      setReasoningShown(true);
      setSolutionShown(true);
      if (item.completedLocally) {
        setQuestCompleted(true);
        setLastXpAwarded(null);
      } else {
        setQuestCompleted(false);
        setLastXpAwarded(null);
      }
      if (rightPaneRef.current) {
        rightPaneRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      // No cached payload (old entry) — submit to fetch and cache
      if (textareaRef.current) {
        gsap.fromTo(
          textareaRef.current,
          { borderColor: "#2563EB" },
          { borderColor: "#E2E8F0", duration: 0.8 },
        );
      }
      requestAnimationFrame(() => {
        void handleSubmit(item.text);
      });
    }
  };

  const handleSuggestionClick = (text: string) => {
    setPrompt(text);
    // Defer submit so stagger animation and DOM settle — fixes first-click reliability
    requestAnimationFrame(() => {
      requestAnimationFrame(() => void handleSubmit(text));
    });
  };

  // set XP bar initial state on mount (avoid flash)
  useLayoutEffect(() => {
    if (!xpFillRef.current) return;
    const ratio = Math.min((xpThisSession || 0) / 50, 1);
    gsap.set(xpFillRef.current, {
      scaleX: ratio,
      transformOrigin: "left center",
    });
  }, [xpThisSession]);

  // animate XP bar when session XP or total changes
  useEffect(() => {
    if (!xpFillRef.current) return;
    const ratio = Math.min((xpThisSession || 0) / 50, 1);
    gsap.to(xpFillRef.current, {
      scaleX: ratio,
      duration: 0.5,
      ease: "power2.out",
      transformOrigin: "left center",
    });
  }, [xpThisSession, totalXp]);

  // animate suggestions on mount when empty
  useEffect(() => {
    if (currentQuest || isLoading) return;
    if (typeof document === "undefined") return;
    const nodes = document.querySelectorAll("[data-quest-suggestion]");
    if (!nodes.length) return;
    setTimeout(() => {
      staggerIn(nodes);
    }, 400);
  }, [currentQuest, isLoading]);

  const suggestions = [
    "How does Big O notation work?",
    "Explain dynamic programming.",
    "Difference between stack and heap?",
  ];

  const allHintsRevealed = totalHints > 0 ? hintsRevealed >= totalHints : true;

  return (
    <div className="bg-slate-50 relative">
      <QuestIllustration />
      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] md:h-[calc(100dvh-3.5rem)] md:max-h-[calc(100dvh-3.5rem)]">
        {/* LEFT PANE */}
        <aside className="relative min-h-0 border-b border-slate-200 bg-slate-50 md:h-full md:border-b-0 md:border-r flex flex-col justify-between overflow-y-auto">
          <div className="flex-1 px-5 pt-6 pb-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2 block">
              Problem
            </label>
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste your problem or question..."
              className="min-h-[120px] resize-none border border-slate-200 rounded-xl text-[14px] leading-relaxed p-3 bg-white focus-visible:ring-0 focus-visible:border-mentrixa-400 shadow-[0_0_0_3px_rgba(37,99,235,0.08)] outline-none transition-all duration-200 hover:border-slate-300"
            />

            {/* Recent */}
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-1.5">Recent</p>
              <div>
                {recentQuests.slice(0, MAX_RECENT).map((item) => (
                  <div
                    key={item.text}
                    className="group flex items-center gap-1 py-1.5 border-b border-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() => handleRecentClick(item)}
                      className="flex-1 text-left text-xs text-slate-500 hover:text-slate-900 truncate min-w-0"
                    >
                      {item.text}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromRecent(item.text);
                      }}
                      aria-label="Remove from recents"
                      className="shrink-0 p-0.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                {recentQuests.length === 0 && (
                  <p className="text-[11px] text-slate-300">No recent questions yet.</p>
                )}
              </div>
            </div>

            {/* Goal selector */}
            <div className="border-t border-slate-200 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">
                Goal
              </p>
              <div className="flex flex-col gap-2">
                {GOAL_OPTIONS.map((g) => {
                  const selected = goal === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoal(g.value)}
                      className={`w-full h-9 rounded-md border text-sm transition-all ${
                        selected
                          ? "bg-mentrixa-50 border-blue-500 text-mentrixa-700 font-semibold"
                          : "bg-transparent border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {g.labelText}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode toggle */}
            <div className="border-t border-slate-200 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">
                Mode
              </p>
              <div className="border border-slate-200 rounded-md overflow-hidden grid grid-cols-2 text-[13px] font-medium h-9">
                <button
                  type="button"
                  onClick={() => setMode("coach")}
                  className={`border-r border-slate-200 transition-colors ${
                    mode === "coach"
                      ? "bg-slate-900 text-white"
                      : "bg-transparent text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Coach
                </button>
                <button
                  type="button"
                  onClick={() => setMode("exam")}
                  className={`transition-colors ${
                    mode === "exam"
                      ? "bg-slate-900 text-white"
                      : "bg-transparent text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Exam
                </button>
              </div>
            </div>

            {submitError && (
              <p className="mt-3 text-xs text-red-500">{submitError}</p>
            )}

            <Button
              className="w-full mt-4 relative overflow-hidden"
              onClick={() => handleSubmit()}
              disabled={isLoading || !prompt.trim()}
            >
              <span>{isLoading ? "Thinking..." : "Ask Mentrixa"}</span>
              {isLoading && (
                <span className="absolute inset-0 rounded-md border border-mentrixa-200 animate-[pulse_1.5s_ease-in-out_infinite]" />
              )}
            </Button>
          </div>

          {/* Bottom XP strip */}
          <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>
              {streakDays === 0
                ? "No streak"
                : streakDays === 1
                  ? "1-day streak"
                  : `${streakDays}-day streak`}
            </span>
            <div className="flex-1 mx-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                ref={xpFillRef}
                className="h-full w-full origin-left bg-gradient-to-r from-emerald-400 via-mentrixa-500 to-indigo-500"
              />
            </div>
            <span>{totalXp} XP</span>
          </div>
        </aside>

        {/* RIGHT PANE */}
        <section
          ref={rightPaneRef}
          className="relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 bg-white md:min-h-0"
        >
          {/* Empty state */}
          {!currentQuest && !isLoading && (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center px-2 sm:px-4 md:h-full md:min-h-0">
              {submitError && (
                <div
                  role="alert"
                  className="mb-6 w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left"
                >
                  <p className="text-sm font-semibold text-red-900">Couldn’t start this quest</p>
                  <p className="text-sm text-red-800 mt-1 leading-relaxed">{submitError}</p>
                </div>
              )}
              <p className="text-sm text-slate-600">Ask a question to begin.</p>
              <div className="mt-4 max-w-md w-full text-left">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-quest-suggestion
                    onClick={() => handleSuggestionClick(s)}
                    className="block w-full text-sm text-mentrixa-600 hover:underline mt-3 text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400 md:h-full md:min-h-0">
              Generating hints…
            </div>
          )}

          {/* Active quest document */}
          {currentQuest && !isLoading && (
            <div className="max-w-3xl mx-auto">
              {/* User prompt */}
              <div className="border-b border-slate-100 pb-6 mb-6">
                <p className="text-xs font-mono text-slate-300 mb-2">Your question</p>
                <p className="text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                  {prompt}
                </p>
              </div>

              {/* Hints */}
              {visibleHints.map((hint, index) => (
                <HintSection
                  key={index}
                  index={index}
                  total={totalHints}
                  text={hint}
                />
              ))}

              {/* Next hint control */}
              {!allHintsRevealed && totalHints > 0 && (
                <div className="flex items-center gap-4 mb-6">
                  <button
                    type="button"
                    onClick={handleRevealNextHint}
                    className="text-sm text-slate-400 hover:text-slate-700 underline underline-offset-2"
                  >
                    Reveal next hint — {totalHints - hintsRevealed} remaining
                  </button>
                  <span className="text-xs font-mono text-slate-300">
                    {hintsRevealed} / {totalHints}
                  </span>
                </div>
              )}

              {/* Reasoning & solution */}
              {allHintsRevealed && (
                <>
                  <ReasoningSection
                    text={currentQuest.reasoning}
                    mode={currentQuest.mode}
                    shown={reasoningShown}
                    onShow={() => setReasoningShown(true)}
                  />
                  {currentQuest.mode === "coach" && currentQuest.solution && (
                    <SolutionSection
                      text={currentQuest.solution}
                      shown={solutionShown}
                      onShow={() => setSolutionShown(true)}
                    />
                  )}

                  {/* Variant problems */}
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">
                      Practice further
                    </p>
                    <div className="space-y-2">
                      {(currentQuest.variants ?? []).slice(0, 3).map((v, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestionClick(v.prompt)}
                          className="flex items-baseline text-sm text-mentrixa-600 hover:underline"
                        >
                          <span className="font-mono text-[11px] text-slate-300 mr-3">
                            {`0${i + 1}`}
                          </span>
                          <span>{v.prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Completion controls: answer input + submit */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    {recordError && (
                      <p className="text-xs text-red-500 mb-3">{recordError}</p>
                    )}
                    {questCompleted ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm font-medium text-slate-700">
                          Quest complete!
                          {lastXpAwarded != null && lastXpAwarded > 0 && (
                            <span className="ml-1.5 text-emerald-600">+{lastXpAwarded} XP</span>
                          )}
                        </p>
                        {lastXpAwarded == null && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            This run is saved in Recents for review only. To answer again for XP, start
                            a new attempt with the same wording.
                          </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                          <Button size="sm" onClick={handleAskAnother}>
                            Ask another question
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading || !prompt.trim()}
                            onClick={() => void handleSubmit()}
                          >
                            Same question, new attempt
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
                          Your answer
                        </p>
                        <Textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder={getAnswerPlaceholder()}
                          className="min-h-[100px] resize-none border border-slate-200 rounded-lg text-sm p-3 bg-slate-50 focus-visible:ring-0 focus-visible:border-mentrixa-400"
                          disabled={submittingAnswer}
                        />
                        {answerFeedback && (
                          <p className="text-xs text-amber-600">{answerFeedback}</p>
                        )}
                        <Button
                          size="sm"
                          onClick={handleSubmitAnswer}
                          disabled={submittingAnswer || !userAnswer.trim()}
                        >
                          {submittingAnswer ? "Checking…" : "Submit answer"}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HintSection({ index, total, text }: { index: number; total: number; text: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const textEl = el.querySelector<HTMLParagraphElement>("[data-hint-text]");
    if (!textEl) return;

    const content = textEl.textContent ?? "";
    textEl.textContent = "";

    const chars: HTMLSpanElement[] = [];
    for (const ch of content) {
      const span = document.createElement("span");
      span.textContent = ch;
      span.style.opacity = "0";
      textEl.appendChild(span);
      chars.push(span);
    }

    gsap.fromTo(
      chars,
      { opacity: 0 },
      {
        opacity: 1,
        stagger: 0.012,
        duration: 0,
        ease: "none",
      },
    );
  }, []);

  return (
    <div
      ref={containerRef}
      data-hint-index={index}
      className="pb-5 mb-6 border-b border-slate-50"
    >
      <p className="text-xs font-mono text-slate-300 mb-2">
        Hint {index + 1} of {total}
      </p>
      <p
        data-hint-text
        className="text-slate-600 text-sm leading-relaxed"
      >
        {text}
      </p>
    </div>
  );
}

function ReasoningSection({
  text,
  mode,
  shown,
  onShow,
}: {
  text: string;
  mode: QuestMode;
  shown: boolean;
  onShow: () => void;
}) {
  const ref = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!shown || !ref.current) return;
    const el = ref.current;
    const content = el.textContent ?? "";
    el.textContent = "";
    const chars: HTMLSpanElement[] = [];
    for (const ch of content) {
      const span = document.createElement("span");
      span.textContent = ch;
      span.style.opacity = "0";
      el.appendChild(span);
      chars.push(span);
    }
    gsap.fromTo(
      chars,
      { opacity: 0 },
      { opacity: 1, stagger: 0.012, duration: 0, ease: "none" },
    );
  }, [shown]);

  if (!text) return null;

  if (!shown) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={onShow}
          className="text-sm text-slate-400 hover:text-slate-700 underline underline-offset-2"
        >
          Show reasoning ({mode === "exam" ? "no solution" : "with solution"})
        </button>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-slate-200 pl-5 mb-6">
      <p className="text-xs font-mono text-slate-300 mb-2">Reasoning</p>
      <p ref={ref} className="text-slate-500 text-sm leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function SolutionSection({
  text,
  shown,
  onShow,
}: {
  text: string;
  shown: boolean;
  onShow: () => void;
}) {
  const ref = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!shown || !ref.current) return;
    const el = ref.current;
    const content = el.textContent ?? "";
    el.textContent = "";
    const chars: HTMLSpanElement[] = [];
    for (const ch of content) {
      const span = document.createElement("span");
      span.textContent = ch;
      span.style.opacity = "0";
      el.appendChild(span);
      chars.push(span);
    }
    gsap.fromTo(
      chars,
      { opacity: 0 },
      { opacity: 1, stagger: 0.012, duration: 0, ease: "none" },
    );
  }, [shown]);

  if (!text) return null;

  if (!shown) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={onShow}
          className="text-sm text-slate-400 hover:text-slate-700 underline underline-offset-2"
        >
          Show full solution
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
      <p className="text-xs font-mono text-slate-300 mb-2">Full solution</p>
      <p ref={ref} className="text-slate-900 text-sm leading-relaxed font-mono whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}

