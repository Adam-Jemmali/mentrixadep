import Link from "next/link";
import { notFound } from "next/navigation";
import { getResolveProblem } from "@/app/actions/resolve";
import { ResolveProblemClient } from "./resolve-problem-client";

type Props = { params: Promise<{ problemId: string }> };

export default async function ResolveProblemPage({ params }: Props) {
  const { problemId } = await params;
  const problem = await getResolveProblem(problemId);

  if (!problem) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/student/resolve" className="text-sm text-slate-600 hover:underline font-medium">
            ← Back to Resolve
          </Link>
          <p className="text-[11px] text-slate-400 font-mono">#{problem.id.slice(0, 8)}</p>
        </div>
        <ResolveProblemClient problem={problem} />
      </main>
    </div>
  );
}
