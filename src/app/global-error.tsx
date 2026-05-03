"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-400">Please try again.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
