"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatTime } from "@/lib/time-format";
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
}

interface TutorProfileClientProps {
  profile: Profile;
  isAuthenticated: boolean;
  isOwnProfile?: boolean;
  viewerRole?: "student" | "tutor" | "admin" | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

function getDayLabel(iso: string): Day {
  const d = new Date(iso).getDay(); // 0=Sun
  const labels: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (labels[d] ?? "Mon") as Day;
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSlotDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSlotDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return formatSlotDate(startIso);
  return `${formatSlotDate(startIso)} -> ${formatSlotDate(endIso)}`;
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

// ─── component ────────────────────────────────────────────────────────────────

export function TutorProfileClient({
  profile,
  isAuthenticated,
  isOwnProfile = false,
  viewerRole = null,
}: TutorProfileClientProps) {
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
  const daysWithSlots = new Set(bookableSlots.map((s) => getDayLabel(s.start_time)));
  const [selectedDay, setSelectedDay] = useState<Day | "All">("All");

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

      {/* ── BOOK A SESSION ────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-[20px] font-bold text-slate-900 mb-1">Book a session</h2>
        {isOwnProfile || viewerRole === "tutor" ? (
          <p className="mb-6 text-sm text-slate-500">
            This is your public booking page preview. Learners can book from here, but tutor accounts cannot book sessions.
          </p>
        ) : (
          <p className="text-sm text-slate-400 mb-6">
            Bookable times in the next 14 days. {" "}
            {profile.autoApprove
              ? "Instant confirmation — auto-approve is on."
              : "Confirmation within a few hours."}
          </p>
        )}

        {/* Day selector */}
        <div className="flex gap-1 mb-5 flex-wrap">
          <button
            onClick={() => setSelectedDay("All")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors duration-100 ${
              selectedDay === "All"
                ? "bg-[#0F172A] text-white border border-[#0F172A]"
                : "border border-[#E2E8F0] bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            All
          </button>
          {DAYS.map((day) => {
            const hasSlots = daysWithSlots.has(day);
            return (
              <button
                key={day}
                disabled={!hasSlots}
                onClick={() => hasSlots && setSelectedDay(day)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors duration-100 ${
                  !hasSlots
                    ? "border border-slate-100 text-slate-300 cursor-not-allowed"
                    : selectedDay === day
                    ? "bg-[#0F172A] text-white border border-[#0F172A]"
                    : "border border-[#E2E8F0] bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Availability table */}
        {filteredSlots.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No slots available {selectedDay !== "All" ? `on ${selectedDay}` : ""}.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="mentrixa-table w-full">
              <thead>
                <tr>
                  <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">Time</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">Course</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">Price</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">Confirmation</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500 border-b border-slate-200">Book</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map((slot) => (
                  <tr
                    key={slot.id}
                    className="avail-row border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-sm text-slate-700">
                      <span className="block">
                        {formatSlotTime(slot.start_time)} - {formatSlotTime(slot.end_time)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatDurationLabel(getSessionDurationMinutes(slot.start_time, slot.end_time))}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {formatSlotDateRange(slot.start_time, slot.end_time)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{slot.course}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                      {formatPriceFromBaseSessionCents(slot.price_per_session)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {profile.autoApprove ? (
                        <span className="text-green-700">Auto</span>
                      ) : (
                        <span className="text-slate-400">Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isOwnProfile || viewerRole === "tutor" ? (
                        <span className="text-xs text-slate-500">Preview only</span>
                      ) : isAuthenticated ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setDialogSlot(slot);
                            setBookingError(null);
                          }}
                        >
                          Book
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            const returnUrl = encodeURIComponent(window.location.pathname);
                            window.location.href = `/auth/signin?redirect=${returnUrl}`;
                          }}
                        >
                          Book
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── REVIEWS ───────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E2E8F0] pt-8 mt-8">
        <h2 className="text-[18px] font-semibold text-slate-900 mb-6">Reviews</h2>

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
                <p className="mt-1 font-mono text-sm font-medium text-neutral-900 dark:text-neutral-900">
                  {formatSlotDate(dialogSlot.start_time)} · {formatTime(dialogSlot.start_time)} –{" "}
                  {formatTime(dialogSlot.end_time)} ·{" "}
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
                  Stripe lists the session and 5% platform fee separately. If you decline this request, the
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
