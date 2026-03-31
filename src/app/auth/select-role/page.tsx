"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setUserRole } from "@/app/actions/auth";
import { GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { motion } from "framer-motion";

type Role = "student" | "tutor";

const ROLES: { type: Role; icon: typeof GraduationCap; title: string; subtext: string }[] = [
  { type: "student", icon: BookOpen, title: "I want to learn", subtext: "Find tutors & earn XP" },
  { type: "tutor", icon: GraduationCap, title: "I want to teach", subtext: "Set your price & hours" },
];

export default function SelectRolePage() {
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    const result = await setUserRole(selected);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/pending-approval");
  }

  return (
    <AuthLayout showLeftPanel={false}>
      <div className="w-full max-w-md flex flex-col items-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="font-display text-2xl font-bold text-text-primary tracking-tight">Mentrixa</span>
        </Link>

        <AuthCard>
          <h2 className="font-display font-bold text-2xl text-text-primary mb-1 text-center">
            One last step
          </h2>
          <p className="text-sm text-text-muted mb-8 text-center">
            Choose your role to complete your registration.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {ROLES.map(({ type, icon: Icon, title, subtext }) => (
              <motion.button
                key={type}
                type="button"
                onClick={() => setSelected(type)}
                className={`flex flex-col items-center justify-center gap-4 p-6 rounded-xl text-center transition-all border-2 min-h-[140px] ${
                  selected === type
                    ? "border-brand-500 bg-brand-50 shadow-glow-sm"
                    : "border border-surface-border bg-white hover:border-brand-300"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon
                  className={`w-8 h-8 shrink-0 ${selected === type ? "text-brand-600" : "text-text-muted"}`}
                  aria-hidden
                />
                <span className={`font-semibold text-sm ${selected === type ? "text-brand-700" : "text-text-primary"}`}>
                  {title}
                </span>
                <span className="text-xs text-text-muted">{subtext}</span>
              </motion.button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 mb-6">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleConfirm}
              disabled={!selected || loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Setting up…" : "Continue"}
            </Button>
          </motion.div>
        </AuthCard>
      </div>
    </AuthLayout>
  );
}
