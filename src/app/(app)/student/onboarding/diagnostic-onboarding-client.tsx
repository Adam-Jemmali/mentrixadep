"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitDiagnosticOnboarding } from "@/app/actions/diagnostic-onboarding";
import type { DiagnosticInput, DiagnosticResult } from "@/lib/diagnostic-onboarding-plan";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const TOTAL_STEPS = 8;

const GOAL_OPTIONS = [
  { value: "exam" as const, label: "Prepare for an exam" },
  { value: "interview" as const, label: "Prepare for an interview" },
  { value: "assignment" as const, label: "Complete an assignment" },
  { value: "general" as const, label: "General improvement" },
];

const TIMELINE_OPTIONS = [
  { value: "this_week" as const, label: "This week" },
  { value: "this_month" as const, label: "This month" },
  { value: "this_semester" as const, label: "This semester" },
  { value: "no_deadline" as const, label: "No specific deadline" },
];

const STYLE_OPTIONS = [
  { value: "visual" as const, label: "Visual (diagrams, videos)" },
  { value: "practice" as const, label: "Practice problems" },
  { value: "reading" as const, label: "Reading & notes" },
  { value: "mixed" as const, label: "Mixed approach" },
];

export function DiagnosticOnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [usedFallbackPlan, setUsedFallbackPlan] = useState(false);

  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState<DiagnosticInput["goal"]>("exam");
  const [timeline, setTimeline] = useState<DiagnosticInput["timeline"]>("this_month");
  const [selfRating, setSelfRating] = useState(3);
  const [weakAreas, setWeakAreas] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [preferredStyle, setPreferredStyle] = useState<DiagnosticInput["preferredStyle"]>("mixed");
  const [priorTutoring, setPriorTutoring] = useState(false);

  const canProceed = (): boolean => {
    if (step === 1) return subject.trim().length >= 2;
    return true;
  };

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await submitDiagnosticOnboarding({
        subject: subject.trim(),
        goal,
        timeline,
        selfRating,
        weakAreas: weakAreas.trim() || undefined,
        hoursPerWeek,
        preferredStyle,
        priorTutoringExperience: priorTutoring,
      });
      if (res.success) {
        setResult(res.result);
        setUsedFallbackPlan(Boolean(res.fromFallback));
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [subject, goal, timeline, selfRating, weakAreas, hoursPerWeek, preferredStyle, priorTutoring]);

  const next = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => (s + 1) as Step);
    } else {
      void handleSubmit();
    }
  };

  const prev = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  if (result) {
    return (
      <div className="space-y-6 text-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Personalized Study Plan</h1>
        {usedFallbackPlan && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950">
            AI was busy, so we built this plan from your answers. You can still start practicing right away.
          </p>
        )}
        <p className="text-base leading-relaxed text-slate-800">{result.summary}</p>

        <div className="grid gap-3">
          {result.studyPlan.map((topic, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border-2 p-4 shadow-sm",
                topic.priority === "high"
                  ? "border-red-300 bg-red-50"
                  : topic.priority === "medium"
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-300 bg-slate-50"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-950">{topic.topic}</h3>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                    topic.priority === "high"
                      ? "bg-red-600 text-white"
                      : topic.priority === "medium"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-600 text-white"
                  )}
                >
                  {topic.priority}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-800">{topic.suggestedApproach}</p>
              <p className="mt-2 text-xs font-medium text-slate-700">~{topic.estimatedHours}h estimated</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4 shadow-sm">
          <h3 className="font-semibold text-blue-950">Recommended pace</h3>
          <p className="mt-1 text-sm font-medium text-blue-900">
            {result.recommendedSessionsPerWeek} session{result.recommendedSessionsPerWeek > 1 ? "s" : ""} per week
            &middot; estimated {result.estimatedWeeksToGoal} weeks to your goal
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams({ prompt: result.firstPracticePrompt });
              router.push(`/student/quest?${params.toString()}`);
            }}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Start your first practice quest
          </button>
          <button
            type="button"
            onClick={() => router.push("/student")}
            className="rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Onboarding</h1>
        <p className="text-slate-700">Answer {TOTAL_STEPS} quick questions so we can build your personalized study plan.</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < step ? "bg-blue-600" : "bg-slate-200"
            )}
          />
        ))}
      </div>

      <div className="min-h-[200px]">
        {step === 1 && (
          <QuestionCard title="What subject do you need help with?">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Calculus II, Organic Chemistry, Python..."
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              autoFocus
            />
          </QuestionCard>
        )}

        {step === 2 && (
          <QuestionCard title="What is your primary goal?">
            <OptionGrid
              options={GOAL_OPTIONS}
              value={goal}
              onChange={(v) => setGoal(v)}
            />
          </QuestionCard>
        )}

        {step === 3 && (
          <QuestionCard title="What is your timeline?">
            <OptionGrid
              options={TIMELINE_OPTIONS}
              value={timeline}
              onChange={(v) => setTimeline(v)}
            />
          </QuestionCard>
        )}

        {step === 4 && (
          <QuestionCard title={`How would you rate your current skill in ${subject || "this subject"}? (1-5)`}>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelfRating(n)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-semibold transition-colors",
                    selfRating === n
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-700">1 = complete beginner, 5 = nearly mastered</p>
          </QuestionCard>
        )}

        {step === 5 && (
          <QuestionCard title="Any specific topics you struggle with? (optional)">
            <textarea
              value={weakAreas}
              onChange={(e) => setWeakAreas(e.target.value)}
              placeholder="e.g. Integration by parts, reaction mechanisms..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </QuestionCard>
        )}

        {step === 6 && (
          <QuestionCard title="How many hours per week can you study?">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-16 text-right text-lg font-semibold text-slate-900">{hoursPerWeek}h</span>
            </div>
          </QuestionCard>
        )}

        {step === 7 && (
          <QuestionCard title="How do you learn best?">
            <OptionGrid
              options={STYLE_OPTIONS}
              value={preferredStyle}
              onChange={(v) => setPreferredStyle(v)}
            />
          </QuestionCard>
        )}

        {step === 8 && (
          <QuestionCard title="Have you worked with a tutor before?">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPriorTutoring(true)}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  priorTutoring
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setPriorTutoring(false)}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  !priorTutoring
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                )}
              >
                No
              </button>
            </div>
          </QuestionCard>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={step === 1}
          className="rounded-lg border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canProceed() || loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Generating plan..." : step === TOTAL_STEPS ? "Generate my study plan" : "Next"}
        </button>
      </div>
    </div>
  );
}

function QuestionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
            value === opt.value
              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
              : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
