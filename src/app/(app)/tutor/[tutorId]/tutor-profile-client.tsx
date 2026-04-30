"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookingPriceBreakdown } from "@/components/booking-price-breakdown";
import { splitSessionPriceCents } from "@/lib/booking-pricing";
import { formatDurationLabel, getSessionDurationMinutes } from "@/lib/stripe-checkout-copy";
import { formatSlotRangeInZone } from "@/lib/time-format";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { Typewriter } from "@/components/ui/typewriter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { APP_TIMEZONES } from "@/lib/timezones";
import { updateUserSettings, type UserSettings } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
gsap.registerPlugin(ScrollTrigger);

// ─── types ────────────────────────────────────────────────────────────────────

interface AvailabilitySlot {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  price_per_session: number | null;
}

interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  sessionCount: number;
  avgRating: number | null;
  ratingCount: number;
  ratingDistribution: { star: number; count: number }[];
  reviews: Review[];
  courses: string[];
  availability: AvailabilitySlot[];
  autoApprove: boolean;
  /** Same IANA zone as Guide settings — slot labels match times they chose when creating availability. */
  tutorTimezone: string;
  privateSettings?: UserSettings;
}

interface TutorProfileClientProps {
  profile: Profile;
  isAuthenticated: boolean;
  isOwnProfile?: boolean;
  viewerRole?: "student" | "tutor" | "admin" | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

function getDayLabel(iso: string): Day {
  const d = new Date(iso).getDay(); // 0=Sun
  const labels: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (labels[d] ?? "Mon") as Day;
}



function formatPrice(cents: number | null): string {
  if (cents == null) return "$25.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatPriceFromBaseSessionCents(baseCents: number | null): string {
  if (baseCents == null) return "$26.25";
  return formatPrice(splitSessionPriceCents(baseCents).totalCents);
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ProfileToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
          checked ? "bg-blue-600" : "bg-slate-200"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function TutorProfileFormSection({ 
  initial, 
  onSaved 
}: { 
  initial: UserSettings; 
  onSaved: () => void 
}) {
  const [form, setForm] = useState<UserSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateUserSettings(form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
  const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 60] as const;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Edit Profile & Settings</h2>
      <p className="text-sm text-slate-500 mb-6">Update your identity and teaching preferences.</p>

      <div className="space-y-6">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Display name</Label>
          <Input 
            value={form.display_name ?? ""} 
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            className="mt-1.5"
            placeholder="Your name for learners"
          />
        </div>

        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bio</Label>
          <Textarea 
            value={form.bio ?? ""} 
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            className="mt-1.5 resize-none"
            rows={4}
            placeholder="Tell learners about your style and expertise..."
          />
        </div>

        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Timezone</Label>
          <select
            value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            className="mt-1.5 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {APP_TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Teaching Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Default duration</Label>
              <select
                value={form.session_default_duration}
                onChange={e => setForm(f => ({ ...f, session_default_duration: Number(e.target.value) }))}
                className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900"
              >
                {DURATION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Buffer between sessions</Label>
              <select
                value={form.session_buffer_minutes}
                onChange={e => setForm(f => ({ ...f, session_buffer_minutes: Number(e.target.value) }))}
                className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900"
              >
                {BUFFER_OPTIONS.map(b => (
                  <option key={b} value={b}>{b === 0 ? "No buffer" : `${b} minutes`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Notifications</h3>
          <ProfileToggle 
            label="Session reminders" 
            description="1 hour before a session starts." 
            checked={form.email_session_reminders} 
            onChange={v => setForm(f => ({ ...f, email_session_reminders: v }))} 
          />
          <ProfileToggle 
            label="Session booked" 
            description="When a student books a session." 
            checked={form.email_session_booked} 
            onChange={v => setForm(f => ({ ...f, email_session_booked: v }))} 
          />
          <ProfileToggle 
            label="Session cancelled" 
            description="When a session is cancelled." 
            checked={form.email_session_cancelled} 
            onChange={v => setForm(f => ({ ...f, email_session_cancelled: v }))} 
          />
        </div>

        {error && <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={saving}
          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white"
        >
          {saving ? "Saving..." : "Save all changes"}
        </Button>
      </div>
    </section>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export function TutorProfileClient({
  profile,
 
  isOwnProfile = false,
  viewerRole = null,
}: TutorProfileClientProps) {
  const router = useRouter();
  const nameRef = useRef<HTMLHeadingElement>(null);
  const statRefs = useRef<HTMLSpanElement[]>([]);
  const ratingBarRefs = useRef<HTMLDivElement[]>([]);
  const reviewRefs = useRef<HTMLDivElement[]>([]);

  const bookableSlots = useMemo(() => {
    const limit = Date.now() + 14 * 86400000;
    return profile.availability.filter((s) => {
      const t = new Date(s.start_time).getTime();
      return t >= Date.now() && t <= limit;
    });
  }, [profile.availability]);

  // Day filter (next 14 days only)
  const [selectedDay] = useState<Day | "All">("All");

  const filteredSlots =
    selectedDay === "All"
      ? bookableSlots
      : bookableSlots.filter((s) => getDayLabel(s.start_time) === selectedDay);

  // Booking dialog
  const [dialogSlot, setDialogSlot] = useState<AvailabilitySlot | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // ── GSAP: name word clip-reveal ────────────────────────────────────────────
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const wordEls = el.querySelectorAll<HTMLSpanElement>(".word-inner");
    gsap.fromTo(
      wordEls,
      { y: "105%" },
      { y: "0%", stagger: 0.08, duration: 0.6, ease: "power4.out", delay: 0.1 },
    );
  }, []);

  // ── GSAP: session count up ─────────────────────────────────────────────────
  useEffect(() => {
    const el = statRefs.current[0];
    if (!el) return;
    const target = profile.sessionCount;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.2,
      ease: "power2.out",
      onUpdate() {
        el.textContent = String(Math.round(obj.val));
      },
    });
  }, [profile.sessionCount]);

  // ── GSAP: availability rows stagger on mount ───────────────────────────────
  useEffect(() => {
    const rows = document.querySelectorAll(".avail-row");
    if (!rows.length) return;
    gsap.fromTo(
      rows,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, stagger: 0.04, duration: 0.25, ease: "power2.out" },
    );
  }, [filteredSlots.length, selectedDay]);

  // ── GSAP: rating bars ScrollTrigger ────────────────────────────────────────
  useEffect(() => {
    const total = profile.ratingCount;
    ratingBarRefs.current.forEach((bar, i) => {
      if (!bar) return;
      const dist = profile.ratingDistribution[i];
      if (!dist) return;
      const ratio = total > 0 ? dist.count / total : 0;
      gsap.fromTo(
        bar,
        { scaleX: 0 },
        {
          scaleX: ratio,
          duration: 0.6,
          ease: "power2.out",
          delay: i * 0.06,
          transformOrigin: "left center",
          scrollTrigger: {
            trigger: bar,
            start: "top 85%",
            once: true,
          },
        },
      );
    });
    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, [profile.ratingDistribution, profile.ratingCount]);

  // ── GSAP: review rows ScrollTrigger stagger ────────────────────────────────
  useEffect(() => {
    const els = reviewRefs.current.filter(Boolean);
    if (!els.length) return;
    gsap.fromTo(
      els,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.07,
        duration: 0.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: els[0],
          start: "top 88%",
          once: true,
        },
      },
    );
  }, [profile.reviews.length]);

  // ── booking ────────────────────────────────────────────────────────────────
  async function handleBook() {
    if (!dialogSlot) return;
    if (isOwnProfile || viewerRole === "tutor") {
      setBookingError("Tutors cannot book their own sessions.");
      setBookingLoading(false);
      return;
    }
    setBookingLoading(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityId: dialogSlot.id }),
      });
      if (res.status === 401) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/auth/signin?redirect=${returnUrl}`;
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setBookingError(data.error ?? "Failed to start checkout");
        setBookingLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setBookingError("Something went wrong. Please try again.");
      setBookingLoading(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  const priceDisplay =
    bookableSlots[0] != null
      ? formatPriceFromBaseSessionCents(bookableSlots[0].price_per_session)
      : profile.availability[0] != null
        ? formatPriceFromBaseSessionCents(profile.availability[0].price_per_session)
        : "$26.25";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -ml-3 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          asChild
        >
          <Link href="/tutor" className="inline-flex items-center gap-1.5">
            <Image src="/icons/guide.svg" alt="" width={12} height={12} className="h-3 w-3 opacity-60" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      {/* ── PROFILE HEADER ────────────────────────────────────────────────── */}
      <div className="border-b border-[#E2E8F0] pb-8 mb-8">

        {/* Name — GSAP word clip-reveal */}
        <h1
          ref={nameRef}
          className="font-extrabold text-[#0F172A] tracking-[-0.04em] leading-none"
          style={{ fontSize: "clamp(36px,5vw,72px)" }}
        >
          {profile.name.split(" ").map((word, i) => (
            <span key={i} className="inline-block overflow-hidden mr-[0.25em] align-bottom">
              <span className="word-inner inline-block">{word}</span>
            </span>
          ))}
        </h1>

        {/* Course tags */}
        {profile.courses.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.courses.map((c) => (
              <span
                key={c}
                className="border border-[#E2E8F0] px-2.5 py-1 rounded text-xs font-mono text-slate-500 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors duration-150 cursor-default"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Bio placeholder */}
        <p className="text-slate-500 text-sm leading-relaxed mt-4 max-w-lg">
          {profile.email} · Mentrixa verified guide
        </p>

        {isOwnProfile && (
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 border border-blue-100">
              Your public profile
            </span>
          </div>
        )}

        {/* Stat bar */}
        <div className="mentrixa-stat-row mt-6">
          <div className="mentrixa-stat-cell">
            <span
              ref={(el) => { if (el) statRefs.current[0] = el; }}
              className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]"
            >
              {profile.sessionCount}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">Sessions taught</span>
          </div>
          <div className="mentrixa-stat-cell">
            <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]">
              {profile.avgRating !== null ? profile.avgRating.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">Avg rating / 5</span>
          </div>
          <div className="mentrixa-stat-cell">
            <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]">~2h</span>
            <span className="text-xs text-slate-400 mt-0.5 block">Response time</span>
          </div>
          <div className="mentrixa-stat-cell">
            <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]">
              {priceDisplay}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">Per session (incl. fee)</span>
          </div>
        </div>

      </div>



      {/* ── REVIEWS ───────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E2E8F0] pt-8 mt-8">
        <h2 className="text-[18px] font-semibold text-slate-900 mb-6 h-[28px]">
          <Typewriter text="Reviews" speed={70} waitTime={8000} />
        </h2>

        {profile.ratingCount === 0 ? (
          <p className="text-sm text-slate-400">No reviews yet.</p>
        ) : (
          <>
            {/* Rating summary */}
            <div className="flex items-end gap-6 mb-8">
              <span className="text-5xl font-bold text-slate-900 tracking-[-0.04em]">
                {profile.avgRating?.toFixed(1) ?? "—"}
              </span>
              <div className="flex-1">
                {profile.ratingDistribution.map((dist, i) => (
                  <div key={dist.star} className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-slate-400 w-14 shrink-0">
                      {dist.star} star
                    </span>
                    <div className="progress-track flex-1 h-1 bg-slate-100 rounded overflow-hidden">
                      <div
                        ref={(el) => { if (el) ratingBarRefs.current[i] = el; }}
                        className="h-full bg-[#2563EB] rounded origin-left"
                        style={{ transform: "scaleX(0)" }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-4 text-right shrink-0">
                      {dist.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review list */}
            <div>
              {profile.reviews.map((review, i) => (
                <div
                  key={i}
                  ref={(el) => { if (el) reviewRefs.current[i] = el; }}
                  className="border-b border-[#F1F5F9] py-5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-400">{review.rating} / 5</span>
                    <span className="text-xs text-slate-300">{relativeDate(review.created_at)}</span>
                  </div>
                  {review.comment && (
                    <p className="text-slate-600 text-sm leading-relaxed mt-2">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {isOwnProfile && profile.privateSettings && (
        <TutorProfileFormSection 
          initial={profile.privateSettings} 
          onSaved={() => {
            router.refresh();
            // Optional: add a global toast here if available
          }}
        />
      )}

      {isOwnProfile && <AccountSecurityPanel className="mt-8" />}

      {/* ── BOOKING DIALOG ────────────────────────────────────────────────── */}
      <Dialog open={!!dialogSlot} onOpenChange={(open) => { if (!open) setDialogSlot(null); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-2 border-neutral-900 bg-white p-5 text-neutral-950 shadow-2xl dark:border-neutral-900 dark:bg-white dark:text-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-black dark:text-black">
              Confirm your session
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-700">
              Review session time and pricing before continuing to secure Stripe checkout.
            </DialogDescription>
          </DialogHeader>

          {dialogSlot && (
            <div className="space-y-4 text-base text-black dark:text-black">
              <div>
                <p className="text-xl font-bold text-black dark:text-black">{profile.name}</p>
                <p className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-900">
                  {dialogSlot.course}
                </p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-900">
                  {formatSlotRangeInZone(
                    dialogSlot.start_time,
                    dialogSlot.end_time,
                    profile.tutorTimezone,
                  )}{" "}
                  ·{" "}
                  {formatDurationLabel(
                    getSessionDurationMinutes(dialogSlot.start_time, dialogSlot.end_time),
                  )}
                </p>
              </div>

              <div className="relative rounded-lg border-2 border-mentrixa-600 bg-mentrixa-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 mb-3">
                  Pricing
                </p>
                <BookingPriceBreakdown
                  sessionPriceCents={dialogSlot.price_per_session ?? 2500}
                />
                <p className="mt-4 border-t-2 border-mentrixa-200 pt-3 text-sm font-medium leading-relaxed text-neutral-900">
                  Stripe lists the session and 15% platform fee separately. If you decline this request, the
                  learner is refunded automatically. Cancellations 60+ minutes before follow your refund policy.
                </p>
                {bookingLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/85">
                    <p className="text-sm font-semibold text-slate-800">Opening secure checkout…</p>
                  </div>
                ) : null}
              </div>

              {bookingError && (
                <p className="text-sm font-semibold text-red-800">{bookingError}</p>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-3 border-t-2 border-neutral-200 pt-4 sm:flex-row sm:justify-end dark:border-neutral-200">
            <Button
              variant="outline"
              onClick={() => setDialogSlot(null)}
              className="h-11 w-full border-2 border-neutral-800 bg-white text-base font-semibold text-black hover:bg-neutral-100 sm:w-auto dark:border-neutral-800 dark:bg-white dark:text-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={bookingLoading}
              className="h-11 w-full bg-mentrixa-600 text-base font-semibold text-white shadow-md hover:bg-mentrixa-700 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-mentrixa-600 focus-visible:ring-offset-2 disabled:bg-slate-500 disabled:text-white disabled:opacity-100 sm:w-auto"
            >
              {bookingLoading ? "Redirecting…" : "Pay & book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
