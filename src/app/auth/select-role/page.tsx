"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setUserRole } from "@/app/actions/auth";
import Image from "next/image";
import { motion } from "framer-motion";
import { BackButton } from "@/components/ui/back-button";
import { getRoleHomePath } from "@/lib/role-home";
import type { UserRole } from "@/lib/database.types";

type Role = "student" | "tutor";

const learnerBenefits = [
  { icon: "/images/live.webp", text: "Match with expert Guides in your Division" },
  { icon: "/images/xp.webp", text: "Earn XP, quests, and climb the leaderboard" },
  { icon: "/images/book.webp", text: "Session Studio output after each call" },
];

const guideBenefits = [
  { icon: "/images/xp.webp", text: "Set your own rates and availability" },
  { icon: "/icons/guide.svg", text: "Build your reputation with verified courses" },
  { icon: "/images/live.webp", text: "Get paid for sessions you approve" },
];

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/student");
    router.prefetch("/tutor");
    router.prefetch("/auth/signin");
  }, [router]);

  async function choose(role: Role) {
    setLoading(true);
    setError(null);
    try {
      const result = await setUserRole(role);

      if (result && "error" in result) {
        setError(result.error ?? "Something went wrong");
        return;
      }

      if (result?.success) {
        const r = (result.role ?? role) as UserRole;
        if (result.approved) {
          router.push(getRoleHomePath(r));
          router.refresh();
        } else {
          setPendingMessage(
            "Your application is under review. You'll receive an email when it's approved. Signing you out now…"
          );
          setTimeout(() => {
            router.push("/auth/signin");
            router.refresh();
          }, 3000);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] w-full flex flex-col">
      <div className="mb-6">
        <BackButton onClick={() => router.push("/")} />
      </div>

      <div className="flex-1 grid lg:grid-cols-2 gap-4 lg:gap-0 lg:min-h-[560px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-xl shadow-slate-900/5 bg-white">
        {/* Learner (left) */}
        <motion.button
          type="button"
          disabled={loading}
          onClick={() => choose("student")}
          onMouseEnter={() => router.prefetch("/student")}
          onTouchStart={() => router.prefetch("/student")}
          className="group relative flex flex-col items-stretch text-left p-8 sm:p-10 lg:p-12 bg-gradient-to-br from-blue-50/90 via-white to-slate-50/80 hover:from-blue-50 hover:to-blue-50/40 transition-colors border-b lg:border-b-0 lg:border-r border-slate-100 disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset"
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: loading ? 1 : 0.995 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/[0.06] group-hover:to-transparent transition-all pointer-events-none" />
          <div className="relative flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 overflow-hidden">
              <Image src="/icons/mentrixer.svg" alt="Mentrixer" width={32} height={32} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700/80">
                Learner
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                I want to learn
              </h2>
            </div>
          </div>
          <p className="relative text-slate-600 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
            Join Divisions, book Guides on your schedule, and turn every session into XP and Studio
            output—without the homework grind alone.
          </p>
          <ul className="relative space-y-4 mb-10 flex-1">
            {learnerBenefits.map(({ icon: iconPath, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-blue-100 shadow-sm overflow-hidden">
                  <Image src={iconPath} alt="" width={16} height={16} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <span className="relative inline-flex items-center justify-center rounded-xl bg-blue-600 text-white font-semibold py-3.5 px-6 text-sm sm:text-base group-hover:bg-blue-700 transition-colors w-full sm:w-auto shadow-md">
            Continue as Learner
          </span>
        </motion.button>

        {/* Guide (right) */}
        <motion.button
          type="button"
          disabled={loading}
          onClick={() => choose("tutor")}
          onMouseEnter={() => router.prefetch("/tutor")}
          onTouchStart={() => router.prefetch("/tutor")}
          className="group relative flex flex-col items-stretch text-left p-8 sm:p-10 lg:p-12 bg-gradient-to-br from-violet-50/90 via-white to-slate-50/80 hover:from-violet-50 hover:to-violet-50/40 transition-colors disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-inset"
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: loading ? 1 : 0.995 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-600/0 group-hover:from-violet-500/[0.07] group-hover:to-transparent transition-all pointer-events-none" />
          <div className="relative flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/25 overflow-hidden">
              <Image src="/icons/guide.svg" alt="Guide" width={32} height={32} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700/80">
                Guide
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                I want to be a Guide
              </h2>
            </div>
          </div>
          <p className="relative text-slate-600 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
            Set your rates, accept session requests, and grow earnings as learners book you—Mentrixa
            handles scheduling and payouts flow alongside your expertise.
          </p>
          <ul className="relative space-y-4 mb-10 flex-1">
            {guideBenefits.map(({ icon: iconPath, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-violet-100 shadow-sm overflow-hidden">
                  <Image src={iconPath} alt="" width={16} height={16} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <span className="relative inline-flex items-center justify-center rounded-xl bg-violet-600 text-white font-semibold py-3.5 px-6 text-sm sm:text-base group-hover:bg-violet-700 transition-colors w-full sm:w-auto shadow-md">
            Continue as Guide
          </span>
        </motion.button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 text-center">
          {error}
        </div>
      )}

      {pendingMessage && (
        <div className="mt-4 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-800 text-center">
          {pendingMessage}
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-slate-500 mt-4" aria-live="polite">
          Setting up your account…
        </p>
      )}
    </div>
  );
}
