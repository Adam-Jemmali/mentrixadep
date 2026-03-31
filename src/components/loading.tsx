"use client";

import { MentrixaLoadingMark } from "@/components/mentrixa-loading-mark";

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <MentrixaLoadingMark size={size} />;
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6">
      <MentrixaLoadingMark size="lg" />
      <p className="text-text-muted text-sm font-medium">{message}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#FAFAFA] bg-mesh-blue">
      <MentrixaLoadingMark size="lg" />
      <p className="text-text-muted text-sm font-medium">Loading...</p>
    </div>
  );
}
