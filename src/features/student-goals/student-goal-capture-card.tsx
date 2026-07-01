"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { saveStudentGoal } from "@/features/student-goals/save-student-goal";
import {
  GOAL_CAPTURE_DISMISS_KEY,
  type StudentGoalType,
} from "@/features/student-goals/types";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

type Step = "pick" | "exam_date" | "percentile_target" | "pace_target";

type Props = {
  subject?: string;
};

function loadDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(GOAL_CAPTURE_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissed() {
  try {
    localStorage.setItem(GOAL_CAPTURE_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function StudentGoalCaptureCard({ subject = AP_CALC_AB_SUBJECT }: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("pick");
  const [targetDate, setTargetDate] = useState("");
  const [targetPercentile, setTargetPercentile] = useState("75");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setVisible(!loadDismissed());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    persistDismissed();
    setVisible(false);
  };

  const submit = (goalType: StudentGoalType) => {
    setError(null);
    startTransition(async () => {
      const payload =
        goalType === "exam_date"
          ? {
              goalType,
              subject,
              targetDate,
            }
          : goalType === "percentile_target"
            ? {
                goalType,
                subject,
                targetPercentile: Number(targetPercentile),
              }
            : { goalType, subject };

      const result = await saveStudentGoal(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      persistDismissed();
      setVisible(false);
    });
  };

  return (
    <section
      className={`${mentrixStudent.card} border-violet-200/80 p-5`}
      aria-label="Set your study goal"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={mentrixStudent.sectionEyebrowOnLight}>Your goal</p>
          <h2 className={`mt-1 text-base font-bold ${mentrixStudent.textOnLight}`}>
            What are you working toward?
          </h2>
          <p className={`mt-1 text-sm ${mentrixStudent.textMutedOnLight}`}>
            One choice shapes every recommendation from here.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className={`text-xs font-medium ${mentrixStudent.textMutedOnLight} hover:text-slate-700`}
        >
          Dismiss
        </button>
      </div>

      {step === "pick" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 border-violet-200 text-sm"
            onClick={() => setStep("exam_date")}
          >
            An exam on a specific date
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 border-violet-200 text-sm"
            onClick={() => setStep("percentile_target")}
          >
            Reach a specific percentile
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 border-violet-200 text-sm"
            onClick={() => void submit("pace_target")}
            disabled={pending}
          >
            Just keep climbing steadily
          </Button>
        </div>
      ) : null}

      {step === "exam_date" ? (
        <div className="mt-4 space-y-3">
          <label className={`block text-sm font-medium ${mentrixStudent.textOnLight}`}>
            Exam date
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("pick")}>
              Back
            </Button>
            <Button
              type="button"
              disabled={pending || !targetDate}
              onClick={() => submit("exam_date")}
            >
              Save goal
            </Button>
          </div>
        </div>
      ) : null}

      {step === "percentile_target" ? (
        <div className="mt-4 space-y-3">
          <label className={`block text-sm font-medium ${mentrixStudent.textOnLight}`}>
            Target percentile
            <input
              type="number"
              min={1}
              max={99}
              value={targetPercentile}
              onChange={(event) => setTargetPercentile(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("pick")}>
              Back
            </Button>
            <Button
              type="button"
              disabled={pending || !targetPercentile}
              onClick={() => submit("percentile_target")}
            >
              Save goal
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
