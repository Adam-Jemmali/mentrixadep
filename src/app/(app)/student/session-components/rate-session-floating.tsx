"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { RateSessionForm } from "../rate-session-form";
import { Button } from "@/components/ui/button";

type Session = {
  id: string;
  course: string;
  status?: string;
  completed?: boolean;
  tutor_id?: string | null;
  tutor?: { id?: string | null } | null;
  ratings?: { id: string; rating: number; comment: string | null }[];
};

export function RateSessionFloating({
  session,
  onDismiss,
}: {
  session: Session | null;
  onDismiss?: () => void;
}) {
  const router = useRouter();

  if (!session) return null;

  const hasRating = !!(session.ratings && session.ratings.length > 0);
  const statusLower = (session.status ?? "").toLowerCase();
  const hasTutor = !!(session.tutor_id ?? session.tutor?.id);
  const canRate = !hasRating && statusLower !== "cancelled" && hasTutor;

  if (!canRate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed bottom-6 right-6 z-50 w-[min(100vw-2rem,380px)] rounded-md border border-slate-200 bg-white p-4 shadow-lg"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Rate your session
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">{session.course}</p>
          </div>
          <Star className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </div>
        <RateSessionForm
          sessionId={session.id}
          canRate={canRate}
          onSuccess={() => {
            onDismiss?.();
            router.refresh();
          }}
        />
        {onDismiss ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-slate-500"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
