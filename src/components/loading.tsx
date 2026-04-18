"use client";

import { motion } from "framer-motion";
import { MentrixaLogoLoader } from "@/components/mentrixa-logo";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

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
    <div className="relative min-h-screen overflow-hidden bg-[#081528] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(96,165,250,0.16), transparent 38%), radial-gradient(circle at 50% 70%, rgba(167,139,250,0.1), transparent 32%), linear-gradient(180deg, #0a1730 0%, #081528 100%)",
        }}
        aria-hidden
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[44vmin] w-[44vmin] min-h-[220px] min-w-[220px] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          className="absolute inset-[8%] rounded-full bg-cyan-300/30 blur-3xl"
          initial={{ scale: 0.2, opacity: 0.55 }}
          animate={{ scale: [0.2, 1.4], opacity: [0.55, 0.2] }}
          transition={{ duration: 2, ease: "easeOut", repeat: Infinity }}
        />
        <motion.img
          src={MENTRIXA_LOGO_PNG}
          alt=""
          className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_90px_rgba(125,211,252,0.95)]"
          initial={{ scale: 0.08 }}
          animate={{ scale: [0.08, 1.45] }}
          transition={{ duration: 2, ease: "easeOut", repeat: Infinity }}
        />
      </motion.div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-[220px] w-[220px] sm:h-[300px] sm:w-[300px]" aria-hidden />
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300/80">
              Loading
            </p>
            <p className="mt-2 text-sm text-slate-400/80">
              Preparing the next page…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
