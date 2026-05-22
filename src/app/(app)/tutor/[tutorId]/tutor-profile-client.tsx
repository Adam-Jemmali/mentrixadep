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
import { TEACHING_DEFAULT_DURATION_OPTIONS_MINUTES } from "@/lib/teaching-defaults";
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
  /** Public guide bio from user_settings — shown in Guide Snapshot after “Update Identity”. */
  bio?: string | null;
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

  const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 60] as const;

  const inputClasses = "mt-1.5 border-indigo-100 bg-slate-50/50 text-indigo-900 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl";

  return (
    <section className="mt-8 overflow-hidden rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.08)]">
      <div className="mb-8 flex items-center gap-3">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-950">Guide Control Center</h2>
      </div>
      <p className="mb-6 text-sm text-slate-500">Update your public guide identity and teaching defaults.</p>

      <div className="space-y-6">
        <div>
          <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Display Name</Label>
          <Input 
            value={form.display_name ?? ""} 
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            className={inputClasses}
            placeholder="Your name for learners"
          />
        </div>

        <div>
          <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Guide Bio</Label>
          <Textarea 
            value={form.bio ?? ""} 
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            className={cn(inputClasses, "resize-none")}
            rows={4}
            placeholder="Tell learners about your style and expertise..."
          />
        </div>

        <div>
          <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Timezone</Label>
          <select
            value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            className={cn(inputClasses, "flex h-11 w-full rounded-xl border px-4 text-sm focus-visible:outline-none focus-visible:ring-2")}
          >
            {APP_TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-indigo-50 pt-8">
          <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-indigo-400">Teaching Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Default duration</Label>
              <select
                value={form.session_default_duration}
                onChange={e => setForm(f => ({ ...f, session_default_duration: Number(e.target.value) }))}
                className="mt-1.5 flex h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-xs text-indigo-900"
              >
                {TEACHING_DEFAULT_DURATION_OPTIONS_MINUTES.map((d) => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Buffer between sessions</Label>
              <select
                value={form.session_buffer_minutes}
                onChange={e => setForm(f => ({ ...f, session_buffer_minutes: Number(e.target.value) }))}
                className="mt-1.5 flex h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-xs text-indigo-900"
              >
                {BUFFER_OPTIONS.map(b => (
                  <option key={b} value={b}>{b === 0 ? "No buffer" : `${b} minutes`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-indigo-50 pt-8">
          <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">Notifications</h3>
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

        {error && <p className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-xs font-bold uppercase italic tracking-widest text-red-600">{error}</p>}

        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={saving}
          className="h-14 min-w-[200px] rounded-2xl bg-indigo-600 text-sm font-black uppercase italic tracking-[0.2em] text-white shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:bg-indigo-500"
        >
          {saving ? "Synchronizing..." : "Update Identity"}
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

  const trimmedGuideBio = (profile.bio ?? "").trim();
  const guideSnapshotText =
    trimmedGuideBio.length > 0
      ? trimmedGuideBio
      : `Teaching ${profile.courses.length > 0 ? profile.courses.slice(0, 2).join(" • ") : "multi-subject sessions"} with clarity, structure, and momentum.`;

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
        window.location.href = `/auth/signin?signin=1&redirect=${returnUrl}`;
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
    <div className="min-h-screen bg-slate-50 pb-24 text-indigo-950">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.06),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/mentrixalogo/logo.webp')] bg-[length:120px_120px] bg-repeat opacity-[0.03]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="mb-12 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 rounded-2xl border border-indigo-100 bg-white px-5 text-[10px] font-black uppercase tracking-widest text-indigo-400 shadow-sm hover:bg-indigo-50 hover:text-indigo-600"
            asChild
          >
            <Link href="/tutor" className="flex items-center gap-2">
              <Image src="/icons/guide.svg" alt="" width={16} height={16} className="h-4 w-4 opacity-60" />
              Guide Dashboard
            </Link>
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-[3rem] border border-indigo-100 bg-white p-10 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.1)]">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">
                Verified Mentrixa Guide
              </p>
              <h1
                ref={nameRef}
                className="font-extrabold tracking-[-0.04em] leading-none text-indigo-950"
                style={{ fontSize: "clamp(36px,5vw,72px)" }}
              >
                {profile.name.split(" ").map((word, i) => (
                  <span key={i} className="mr-[0.25em] inline-block overflow-hidden align-bottom">
                    <span className="word-inner inline-block">{word}</span>
                  </span>
                ))}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-500">
                {profile.email} · Teaching excellence through live Mentrixa sessions.
              </p>
              

              {profile.courses.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {profile.courses.map((c) => (
                    <span
                      key={c}
                      className="cursor-default rounded border border-indigo-100 bg-slate-50/40 px-2.5 py-1 text-xs font-mono text-slate-500 transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mentrixa-stat-row mt-4">
                <div className="mentrixa-stat-cell">
                  <span
                    ref={(el) => {
                      if (el) statRefs.current[0] = el;
                    }}
                    className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]"
                  >
                    {profile.sessionCount}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">Sessions taught</span>
                </div>
                <div className="mentrixa-stat-cell">
                  <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]">
                    {profile.avgRating !== null ? profile.avgRating.toFixed(1) : "—"}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">Avg rating / 5</span>
                </div>
                <div className="mentrixa-stat-cell">
                  <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]">~2h</span>
                  <span className="mt-0.5 block text-xs text-slate-400">Response time</span>
                </div>
                <div className="mentrixa-stat-cell">
                  <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]">
                    {priceDisplay}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">Per session (incl. fee)</span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-8 lg:w-80 lg:shrink-0">
              <div className="rounded-[2rem] border border-indigo-50 bg-indigo-50/20 p-6 backdrop-blur-sm">
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-indigo-300">Guide Snapshot</p>
                <p
                  className={cn(
                    "text-sm font-medium italic leading-relaxed text-indigo-800",
                    trimmedGuideBio.length > 0 ? "whitespace-pre-wrap" : "",
                  )}
                >
                  &quot;{guideSnapshotText}&quot;
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-indigo-50 bg-white p-5 text-center shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reviews</p>
                  <p className="mt-1 font-mono text-2xl font-black text-indigo-900">{profile.ratingCount}</p>
                </div>
                <div className="rounded-2xl border border-indigo-50 bg-white p-5 text-center shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Courses</p>
                  <p className="mt-1 font-mono text-2xl font-black text-indigo-900">{profile.courses.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <section className="rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]">
              <h2 className="mb-6 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950">
                Availability Grid
              </h2>
              {filteredSlots.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-indigo-50 py-4 text-center text-xs italic text-slate-400">
                  No open slots in the next 14 days.
                </p>
              ) : (
                <ul className="space-y-3">
                  {filteredSlots.map((slot) => (
                    <li
                      key={slot.id}
                      className="avail-row flex flex-col gap-3 rounded-2xl border border-indigo-50 bg-slate-50/30 p-4 transition-all hover:border-indigo-100 hover:bg-white hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-black italic tracking-tight text-indigo-900">{slot.course}</p>
                        <p className="text-xs text-slate-500">
                          {formatSlotRangeInZone(slot.start_time, slot.end_time, profile.tutorTimezone)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-500">
                          {formatPriceFromBaseSessionCents(slot.price_per_session)}
                        </span>
                        {(!isOwnProfile && viewerRole !== "tutor") ? (
                          <Button
                            type="button"
                            onClick={() => setDialogSlot(slot)}
                            className="h-9 rounded-xl bg-indigo-600 px-4 text-[10px] font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                          >
                            Book
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]">
              <h2 className="mb-6 h-[28px] text-[18px] font-semibold text-slate-900">
                <Typewriter text="Reviews" speed={70} waitTime={8000} />
              </h2>

              {profile.ratingCount === 0 ? (
                <p className="text-sm text-slate-400">No reviews yet.</p>
              ) : (
                <>
                  <div className="mb-8 flex items-end gap-6">
                    <span className="text-5xl font-bold tracking-[-0.04em] text-slate-900">
                      {profile.avgRating?.toFixed(1) ?? "—"}
                    </span>
                    <div className="flex-1">
                      {profile.ratingDistribution.map((dist, i) => (
                        <div key={dist.star} className="mb-1 flex items-center gap-3">
                          <span className="w-14 shrink-0 text-xs font-mono text-slate-400">
                            {dist.star} star
                          </span>
                          <div className="progress-track h-1 flex-1 overflow-hidden rounded bg-slate-100">
                            <div
                              ref={(el) => {
                                if (el) ratingBarRefs.current[i] = el;
                              }}
                              className="h-full origin-left rounded bg-[#2563EB]"
                              style={{ transform: "scaleX(0)" }}
                            />
                          </div>
                          <span className="w-4 shrink-0 text-right text-xs font-mono text-slate-400">
                            {dist.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    {profile.reviews.map((review, i) => (
                      <div
                        key={i}
                        ref={(el) => {
                          if (el) reviewRefs.current[i] = el;
                        }}
                        className="border-b border-[#F1F5F9] py-5 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-slate-400">{review.rating} / 5</span>
                          <span className="text-xs text-slate-300">{relativeDate(review.created_at)}</span>
                        </div>
                        {review.comment ? (
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {isOwnProfile && profile.privateSettings ? (
              <TutorProfileFormSection
                initial={profile.privateSettings}
                onSaved={() => {
                  router.refresh();
                }}
              />
            ) : null}

            {isOwnProfile ? <AccountSecurityPanel className="mt-8" /> : null}
          </div>

          <div className="space-y-10">
            <div className="rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]">
              <h2 className="mb-8 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950">Course Arsenal</h2>
              {profile.courses.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-indigo-50 py-4 text-center text-xs italic text-slate-400">
                  No subjects listed yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {profile.courses.map((course) => (
                    <li key={course} className="rounded-2xl border border-indigo-50 bg-slate-50/30 p-4 text-sm font-bold text-indigo-900">
                      {course}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </main>

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
