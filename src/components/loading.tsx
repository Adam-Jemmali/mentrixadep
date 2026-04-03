"use client";

import { MentrixaLogoLoader } from "@/components/mentrixa-logo";

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const mapped = size === "sm" ? "sm" : size === "lg" ? "lg" : "md";
  return <MentrixaLogoLoader size={mapped} />;
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6">
      <MentrixaLogoLoader size="lg" label={message} />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-[#FAFAFA] relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 35%, rgba(59,130,246,0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99,102,241,0.08), transparent 50%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(120vw,520px)] w-[min(120vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.22] blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(59,130,246,0.25), transparent 40%, rgba(99,102,241,0.2), transparent 80%)",
        }}
        aria-hidden
      />
      <MentrixaLogoLoader size="xl" label="Loading" />
    </div>
  );
}
