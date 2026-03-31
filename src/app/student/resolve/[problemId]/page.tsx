import Link from "next/link";

type Props = { params: Promise<{ problemId: string }> };

export default async function ResolveProblemPage({ params }: Props) {
  const { problemId } = await params;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-xs font-mono text-slate-400 mb-2">Problem id</p>
        <h1 className="text-lg font-semibold text-slate-900 break-all mb-4">{problemId}</h1>
        <p className="text-sm text-slate-600 mb-6">
          Full guided resolve (diagnosis, proof checks, and links) will be wired to this id in a
          future update. Your session was started successfully.
        </p>
        <Link
          href="/student/resolve"
          className="text-sm text-mentrixa-600 hover:underline font-medium"
        >
          ← Back to Resolve
        </Link>
      </main>
    </div>
  );
}
