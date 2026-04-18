"use client";

import Image from "next/image";
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
      <div
        className="pointer-events-none absolute inset-0 bg-[url('/mentrixalogo/logo.png')] bg-[length:116px_116px] bg-repeat opacity-[0.04]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(128vw,620px)] w-[min(128vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.2] blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(59,130,246,0.22), transparent 32%, rgba(168,85,247,0.16), transparent 68%, rgba(96,165,250,0.2))",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="flex flex-col items-center gap-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: [0.92, 1.04, 0.95], rotate: [0, 360] }}
            transition={{
              opacity: { duration: 0.3, ease: "easeOut" },
              scale: { duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
              rotate: { duration: 2.9, ease: "linear", repeat: Infinity },
            }}
            className="relative flex h-[240px] w-[240px] items-center justify-center sm:h-[320px] sm:w-[320px]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, ease: "linear", repeat: Infinity }}
              className="absolute inset-0 rounded-full border border-white/10"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, ease: "linear", repeat: Infinity }}
              className="absolute inset-4 rounded-full border border-cyan-300/20 border-t-cyan-200/70 border-r-transparent"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6.5, ease: "linear", repeat: Infinity }}
              className="absolute inset-9 rounded-full border border-violet-300/18 border-b-violet-300/70 border-l-transparent"
            />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0)_62%)]" />
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 360] }}
              transition={{ duration: 2.8, ease: "linear", repeat: Infinity }}
              className="relative h-28 w-28 sm:h-36 sm:w-36"
            >
              <Image
                src={MENTRIXA_LOGO_PNG}
                alt="Mentrixa"
                fill
                className="object-contain drop-shadow-[0_0_30px_rgba(96,165,250,0.35)]"
                sizes="144px"
              />
            </motion.div>
          </motion.div>
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
