import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { Button } from "@/shared/ui/button";
import { formatDate } from "@/shared/core/time-format";
import { formatDurationLabel, getSessionDurationMinutes } from "@/shared/integrations/stripe/checkout-copy";
import { AddToCalendarButton } from "./add-to-calendar-button";
import { getStudentSessionCheckoutCents, splitSessionPriceCents } from "@/features/booking/booking-pricing";
import { isMomentumMemberForUser } from "@/features/entitlements/momentum-comp-members";
import { formatUsdFromCents } from "@/features/duels/duel-reward";
import { Typewriter } from "@/shared/ui/typewriter";
import { GlassTimeCard } from "@/shared/ui/glass-time-card";
import { CheckCircle2, ChevronRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ request?: string }>;
}

export default async function BookingConfirmedPage({ searchParams }: PageProps) {
  const user = await requireRole(["student", "admin"]);
  const sp = await searchParams;
  const requestId = sp.request?.trim();
  if (!requestId) {
    notFound();
  }

  const supabase = await createClient();

  const { data: sr, error: srErr } = await supabase
    .from("session_requests")
    .select("id, status, created_at, availability_id, tutor_id")
    .eq("id", requestId)
    .eq("student_id", user.id)
    .single();

  if (srErr || !sr) {
    notFound();
  }

  const { data: availability, error: avErr } = await supabase
    .from("availability")
    .select("course, start_time, end_time, price_per_session")
    .eq("id", sr.availability_id)
    .single();

  if (avErr || !availability) {
    notFound();
  }

  const momentumSubscriber = await isMomentumMemberForUser(user.id);
  const durationMin = getSessionDurationMinutes(availability.start_time, availability.end_time);
  const price = splitSessionPriceCents(
    getStudentSessionCheckoutCents({ momentumSubscriber }),
  );

  return (
    <div className="min-h-screen bg-mentrixa-app text-white relative overflow-hidden flex items-center justify-center py-12 px-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 w-full max-w-2xl">
        <div className="flex flex-col items-center text-center space-y-8">
          
          {/* Success Icon & Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-3 bg-emerald-500/20 rounded-full border border-emerald-500/30 animate-pulse">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
               
                Payment received
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mt-2">
                Session request sent
              </h1>
            </div>
            
            <div className="max-w-md mx-auto">
               <Typewriter 
                text={`Your guide will confirm soon${sr.status === "approved" ? " (this slot is approved)" : ""}. You will get email updates. If the guide declines, Stripe refunds you automatically.`}
                speed={30}
                className="text-slate-400 text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Session Details Card */}
          <div className="w-full max-w-lg space-y-4">
            <GlassTimeCard 
              time={availability.start_time} 
              staticTime 
              showTimezone 
              className="bg-white/10"
            />
            
            <div className="p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</p>
                  <h3 className="text-xl font-bold text-white tracking-tight">{availability.course.toUpperCase()}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Duration</p>
                  <p className="text-lg font-bold text-white tracking-tight">{formatDurationLabel(durationMin)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 text-sm text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Price</span>
                  <span className="text-white font-bold">{formatUsdFromCents(price.totalCents)}</span>
                </div>
                <p className="text-[10px] text-slate-500 italic text-center mt-2 border-t border-slate-800 pt-3">
                  Breakdown: {formatUsdFromCents(price.sessionCents)} session + {formatUsdFromCents(price.platformFeeCents)} platform fee
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
            <div className="flex-1 w-full">
              <AddToCalendarButton
                requestId={sr.id}
                title={`Mentrixa. ${availability.course}`}
                description={`Learner session. Request ${sr.id.slice(0, 8)}…. ${formatDate(availability.start_time)}`}
                startIso={availability.start_time}
                endIso={availability.end_time}
              />
            </div>
            <Button asChild size="lg" className="flex-1 w-full font-bold group">
              <Link
                href={
                  sr.status === "approved"
                    ? "/student?sessionsTab=upcoming#sessions-history"
                    : "/student?sessionsTab=requests#sessions-history"
                }
                className="flex items-center justify-center gap-2"
              >
                {sr.status === "approved" ? "View upcoming session" : "Back to dashboard"}
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
}

