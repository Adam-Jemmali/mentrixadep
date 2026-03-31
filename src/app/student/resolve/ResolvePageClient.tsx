"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResolveInput } from "@/components/resolve";
import { submitResolveProblem } from "@/app/actions/resolve";

export function ResolvePageClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(problemText: string) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await submitResolveProblem(problemText);
      if ("error" in result && result.error) {
        setError(result.message);
        return;
      }
      if ("problemId" in result) {
        router.push(`/student/resolve/${result.problemId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      <ResolveInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
