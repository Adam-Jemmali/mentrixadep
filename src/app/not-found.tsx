export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you are looking for does not exist or has moved.
        </p>
        {/* Plain <a> keeps this file free of client chunks; next/link here caused lazy-chunk races in dev. */}
        <a
          href="/"
          className="mt-6 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to home
        </a>
      </div>
    </main>
  );
}
