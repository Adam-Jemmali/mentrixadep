"use client";

import { Badge } from "@/components/ui/badge";

export type ResolveRoute = "quest" | "session" | "both";

interface ResolveDiagnosisProps {
  route: ResolveRoute;
  confidence: number;
  summary: string;
  stuck_points: string[];
  suggested_course?: string;
}

const ROUTE_LABELS: Record<ResolveRoute, string> = {
  quest: "Practice on your own",
  session: "Book a session",
  both: "Practice + session",
};

const ROUTE_VARIANTS: Record<ResolveRoute, string> = {
  quest: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  session: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  both: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

export function ResolveDiagnosis({
  route,
  confidence,
  summary,
  stuck_points,
  suggested_course,
}: ResolveDiagnosisProps) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={ROUTE_VARIANTS[route]}>{ROUTE_LABELS[route]}</Badge>
        <span className="text-xs text-slate-500">
          {Math.round(confidence * 100)}% confidence
        </span>
        {suggested_course && (
          <Badge variant="outline" className="text-xs">
            {suggested_course}
          </Badge>
        )}
      </div>
      <p className="text-sm text-slate-700">{summary}</p>
      {stuck_points.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Areas to focus:</p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
            {stuck_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
