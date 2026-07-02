"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Calendar, DollarSign, Check, Info, ShieldCheck, X } from "lucide-react";
import { cn } from "@/shared/core/utils";
import Image from "next/image";
import { Button } from "@/shared/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { BookingPriceBreakdown } from "@/features/booking/booking-price-breakdown";
import Link from "next/link";
import { splitSessionPriceCents } from "@/features/booking/booking-pricing";
import { buildCheckoutPriceAnchor } from "@/features/booking/checkout-price-anchor-pure";
import { formatUsdFromCents } from "@/features/duels/duel-reward";
import { PriceBreakdownPopover } from "@/shared/ui/popover-patterns";
import { TutorAvatar } from "@/app/(app)/student/session-components/tutor-avatar";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

interface BookingConfirmationCardProps {
  tutorName: string;
  tutorEmail: string;
  tutorAvatarUrl?: string | null;
  courseName: string;
  scheduleLine: string;
  qualifications?: string;
  priceCents: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** Shown above footer actions when checkout start fails (e.g. slot locked by another learner). */
  errorMessage?: string | null;
  momentumSubscriber?: boolean;
  sessionCreditAvailable?: boolean;
  packSprintCreditsRemaining?: number;
  monthlyCreditsRemaining?: number;
  useSessionCredit?: boolean;
  onUseSessionCreditChange?: (value: boolean) => void;
  className?: string;
  enableAnimations?: boolean;
}

export function BookingConfirmationCard({
  tutorName,
  tutorEmail,
  tutorAvatarUrl,
  courseName,
  scheduleLine,
  qualifications,
  priceCents,
  onConfirm,
  onCancel,
  loading = false,
  errorMessage = null,
  momentumSubscriber = false,
  sessionCreditAvailable = false,
  packSprintCreditsRemaining = 0,
  monthlyCreditsRemaining = 0,
  useSessionCredit = false,
  onUseSessionCreditChange,
  className,
  enableAnimations = true,
}: BookingConfirmationCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;
  const priceSplit = splitSessionPriceCents(priceCents);
  const payingWithCredit = sessionCreditAvailable && useSessionCredit;
  const priceAnchor = buildCheckoutPriceAnchor({
    momentumSubscriber,
    sessionCreditAvailable,
    useSessionCredit,
    packSprintCreditsRemaining,
    monthlyCreditsRemaining,
  });

  const tierClass = (tier: typeof priceAnchor.activeTier) =>
    cn(
      "rounded-lg border px-3 py-2 text-center",
      priceAnchor.activeTier === tier
        ? "border-indigo-400/60 bg-indigo-500/15"
        : "border-slate-700/80 bg-slate-800/40",
    );

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1, scale: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1, y: 0,
      transition: { type: "spring", stiffness: 400, damping: 28 }
    },
  };

  return (
    <motion.div
      variants={shouldAnimate ? containerVariants : {}}
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      className={cn(
        "bg-[#0F172A] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-w-lg w-full relative",
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-gradient-to-br from-slate-900 to-[#0F172A]">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
            <Image src={MENTRIXA_LOGO_PNG} alt="Mentrixa" width={20} height={20} className="brightness-0 invert" />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onCancel} 
            className="rounded-full bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Book a session</h2>
        <p className="text-sm text-slate-400 mt-1">Review details before secure checkout</p>
      </div>

      <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
        {/* Tutor Profile */}
        <motion.div variants={shouldAnimate ? itemVariants : {}} className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <TutorAvatar 
            displayName={tutorName} 
            emailPrefix={tutorEmail?.split("@")[0] || "Guide"} 
            avatarUrl={tutorAvatarUrl} 
            size="lg" 
          />
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{tutorName}</h3>
            <p className="text-sm text-slate-400 truncate">{tutorEmail}</p>
          </div>
        </motion.div>

        {/* Session Details */}
        <motion.div variants={shouldAnimate ? itemVariants : {}} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Check className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subject</p>
              <p className="text-lg font-bold text-white">{courseName.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Schedule</p>
              <p className="text-sm font-medium text-slate-200">{scheduleLine}</p>
            </div>
          </div>
        </motion.div>

        {/* Qualifications */}
        {qualifications && (
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qualifications</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-200 italic">{qualifications}</p>
          </motion.div>
        )}

        {/* Pricing */}
        <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pricing</p>
            </div>
            {!payingWithCredit ? <PriceBreakdownPopover sessionPriceCents={priceCents} /> : null}
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className={tierClass("payg")}>
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <MentrixaVocabIcon name="breakthrough" size={12} title="Pay as you go" />
                Pay as you go
              </p>
              <p className="mt-1 text-sm font-bold text-white">{priceAnchor.paygLabel}</p>
            </div>
            <div className={tierClass("member")}>
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <MentrixaVocabIcon name="momentum" size={12} title="Member" />
                Member
              </p>
              <p className="mt-1 text-sm font-bold text-white">{priceAnchor.memberLabel}</p>
            </div>
            <div className={tierClass("credit")}>
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <MentrixaVocabIcon name="session" size={12} title="Credit" />
                Credit
              </p>
              <p className="mt-1 text-sm font-bold text-white">{priceAnchor.creditLabel}</p>
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">{formatUsdFromCents(priceSplit.totalCents)}</p>
          <p className="mt-1 text-xs text-slate-400">{priceAnchor.headline}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{priceAnchor.subline}</p>
          {sessionCreditAvailable && onUseSessionCreditChange ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={useSessionCredit}
                onChange={(event) => onUseSessionCreditChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
              />
              <span className="text-xs leading-relaxed text-emerald-100">
                Use your included session credit for this booking. Uncheck to pay the member rate instead.
              </span>
            </label>
          ) : null}
          {payingWithCredit ? (
            <p className="mt-2 text-xs font-medium text-emerald-400/90">
              No Stripe charge. Your monthly included session covers this booking.
            </p>
          ) : momentumSubscriber ? null : (
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              <Link href="/student/subscribe" className="font-medium text-indigo-400 underline hover:text-indigo-300">
                View Momentum plan
              </Link>
            </p>
          )}
          {!payingWithCredit ? (
            <div className="mt-4 hidden sm:block text-slate-100">
              <BookingPriceBreakdown sessionPriceCents={priceCents} />
            </div>
          ) : null}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed text-slate-500 italic">
              Secure checkout via Stripe. Includes 15% platform fee. Automatic refund if the guide declines.
              Cancel 60+ minutes before start for full refund.
            </p>
          </div>
        </motion.div>
      </div>

      {errorMessage ? (
        <div className="px-6 pb-1">
          <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm leading-snug text-amber-100">
            {errorMessage}
          </p>
        </div>
      ) : null}

      {/* Footer Actions */}
      <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 py-6 border-slate-700 text-slate-400 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className="flex-[2] py-6 text-white font-bold"
        >
          <span className={cn("flex items-center justify-center gap-2 transition-opacity", loading ? "opacity-0" : "opacity-100")}>
            {payingWithCredit ? "Book with credit" : "Pay & book"}
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </span>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
