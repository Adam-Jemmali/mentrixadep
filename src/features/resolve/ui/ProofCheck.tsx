"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

interface ProofCheckQuestion {
  prompt: string;
  expectedKeywords?: string[];
}

interface ProofCheckProps {
  questions: ProofCheckQuestion[];
  onSubmit?: (answers: Record<string, string>) => Promise<void>;
}

export function ProofCheck({ questions, onSubmit }: ProofCheckProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!onSubmit) return;
    setLoading(true);
    try {
      await onSubmit(answers);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No proof-check questions yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Retention check</h3>
      <p className="text-xs text-slate-500">
        Answer these questions to reinforce what you learned.
      </p>
      {submitted ? (
        <p className="text-sm text-slate-600">Thanks for completing the check.</p>
      ) : (
        <>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {q.prompt}
                </label>
                <Textarea
                  value={answers[i] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                  placeholder="Your answer…"
                  className="min-h-[60px]"
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting…" : "Submit answers"}
          </Button>
        </>
      )}
    </div>
  );
}
