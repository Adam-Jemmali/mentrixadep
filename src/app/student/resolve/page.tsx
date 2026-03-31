import { ResolvePageClient } from "./ResolvePageClient";

export default function ResolvePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
          Resolve
        </h1>
        <p className="text-slate-600 mb-8">
          Tell us what you&apos;re stuck on. We&apos;ll point you to the right path.
        </p>
        <ResolvePageClient />
      </main>
    </div>
  );
}
