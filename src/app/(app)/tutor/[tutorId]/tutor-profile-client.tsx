"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { BookingPriceBreakdown } from "@/features/booking/booking-price-breakdown";
import { PriceBreakdownPopover } from "@/shared/ui/popover-patterns";
import {
  splitSessionPriceCents,
  formatStudentBreakthroughPrice,
  getStudentSessionCheckoutCents,
} from "@/features/booking/booking-pricing";
import { formatDurationLabel, getSessionDurationMinutes } from "@/shared/integrations/stripe/checkout-copy";
import { formatSlotRangeInZone } from "@/shared/core/time-format";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { MentrixaTimezoneSelect, MentrixaSelect, bufferSelectOptions, durationSelectOptions } from "@/shared/ui/select-patterns";
import { updateUserSettings, type UserSettings } from "@/features/settings/user-settings";
import { cn } from "@/shared/core/utils";
import { TEACHING_DEFAULT_DURATION_OPTIONS_MINUTES } from "@/features/tutor/teaching-defaults";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import type { GuideImpactEntry, GuideImpactNodeEntry } from "@/features/guide-impact/impact-score-pure";
import type { GuidePortfolioCard } from "@/features/guide-portfolio/guide-portfolio-pure";
import type { GuideBreakthrough } from "@/features/guide-rank/reads";
import { GuidePublicProfileHeader } from "@/features/tutor/ui/public-profile/guide-public-profile-header";
import { GuidePublicImpactChipsSection } from "@/features/tutor/ui/public-profile/guide-public-impact-chips-section";
import { GuidePublicPortfolioSection } from "@/features/tutor/ui/public-profile/guide-public-portfolio-section";
import { GuidePublicBookingSection } from "@/features/tutor/ui/public-profile/guide-public-booking-section";
import { GuidePublicReviewsSection } from "@/features/tutor/ui/public-profile/guide-public-reviews-section";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { KokonutGlass } from "@/shared/ui/kokonut-glass";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_PROFILE_ICON } from "@/shared/icons/vocab-canonical";

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
  avatarUrl?: string | null;
  sessionCount: number;
  avgRating: number | null;
  ratingCount: number;
  ratingDistribution: { star: number; count: number }[];
  reviews: Review[];
  courses: string[];
  availability: AvailabilitySlot[];
  autoApprove: boolean;
  tutorTimezone: string;
  bio?: string | null;
  impactScores?: GuideImpactEntry[];
  impactNodeScores?: GuideImpactNodeEntry[];
  guideRank?: string;
  avgImpactScore?: number | null;
  responseRatePercent?: number | null;
  showUpRatePercent?: number | null;
  breakthroughs?: GuideBreakthrough[];
  teachingPortfolio?: {
    cards: GuidePortfolioCard[];
    hasMore: boolean;
  } | null;
  privateSettings?: UserSettings;
}

interface TutorProfileClientProps {
  profile: Profile;
  isAuthenticated: boolean;
  isOwnProfile?: boolean;
  viewerRole?: "student" | "tutor" | "admin" | null;
  momentumSubscriber?: boolean;
}

function formatPriceFromBaseSessionCents(baseCents: number | null, studentView = true): string {
  if (studentView) return formatStudentBreakthroughPrice();
  if (baseCents == null) return "$26.25";
  return `$${(splitSessionPriceCents(baseCents).totalCents / 100).toFixed(2)}`;
}

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
    <div className="flex items-start justify-between gap-4 border-b border-indigo-50 py-4 last:border-b-0">
      <div className="space-y-1">
        <p className="text-sm font-bold text-indigo-900">{label}</p>
        <p className="text-[11px] leading-relaxed text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
          checked ? "bg-indigo-600" : "bg-indigo-100",
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function TutorProfileFormSection({ initial, onSaved }: { initial: UserSettings; onSaved: () => void }) {
  const [form, setForm] = useState<UserSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 60] as const;
  const inputClasses =
    "mt-1.5 border-indigo-100 bg-slate-50/50 text-indigo-900 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl";

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

  return (
    <GuideAnimatedSticky variant="curl" staggerIndex={6}>
      <h2 className="mb-4 text-sm font-bold text-[#0B1220]">Guide control center</h2>
      <p className="mb-4 text-sm text-[#475569]">Update your public guide identity and teaching defaults.</p>
      <div className="space-y-4">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Display name</Label>
          <Input
            value={form.display_name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            className={inputClasses}
            placeholder="Your name for learners"
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Guide bio</Label>
          <Textarea
            value={form.bio ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className={cn(inputClasses, "resize-none")}
            rows={4}
            placeholder="Tell learners about your style and expertise..."
          />
        </div>
        <MentrixaTimezoneSelect
          value={form.timezone}
          onChange={(tz) => setForm((f) => ({ ...f, timezone: tz }))}
          label="Timezone"
          brandKind="guide"
        />
        <div className="border-t border-indigo-50 pt-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-indigo-400">Teaching defaults</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MentrixaSelect
              label="Default duration"
              brandKind="guide"
              options={durationSelectOptions(TEACHING_DEFAULT_DURATION_OPTIONS_MINUTES)}
              value={String(form.session_default_duration)}
              onChange={(id) => id && setForm((f) => ({ ...f, session_default_duration: Number(id) }))}
              triggerClassName="mt-1.5 text-xs"
            />
            <MentrixaSelect
              label="Buffer between sessions"
              brandKind="guide"
              options={bufferSelectOptions(BUFFER_OPTIONS)}
              value={String(form.session_buffer_minutes)}
              onChange={(id) => id && setForm((f) => ({ ...f, session_buffer_minutes: Number(id) }))}
              triggerClassName="mt-1.5 text-xs"
            />
          </div>
        </div>
        <ProfileToggle
          label="Session reminders"
          description="1 hour before a session starts."
          checked={form.email_session_reminders}
          onChange={(v) => setForm((f) => ({ ...f, email_session_reminders: v }))}
        />
        <ProfileToggle
          label="Session booked"
          description="When a student books a session."
          checked={form.email_session_booked}
          onChange={(v) => setForm((f) => ({ ...f, email_session_booked: v }))}
        />
        <ProfileToggle
          label="Session cancelled"
          description="When a session is cancelled."
          checked={form.email_session_cancelled}
          onChange={(v) => setForm((f) => ({ ...f, email_session_cancelled: v }))}
        />
        {error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-xl bg-[#7C3AED] px-5 text-sm font-bold text-white hover:bg-[#6D28D9]"
        >
          {saving ? "Saving…" : "Update identity"}
        </Button>
      </div>
    </GuideAnimatedSticky>
  );
}

export function TutorProfileClient({
  profile,
  isOwnProfile = false,
  viewerRole = null,
  momentumSubscriber = false,
}: TutorProfileClientProps) {
  const router = useRouter();
  const displaySkills = useMemo(() => profile.courses.filter(isApCalculusAbSubject), [profile.courses]);
  const impactNodeScores = profile.impactNodeScores ?? [];

  const [dialogSlot, setDialogSlot] = useState<AvailabilitySlot | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#0B1220] pb-20 text-white">
      <main className="relative z-10 mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <div className="mb-4">
          <Link
            href={isOwnProfile ? "/tutor" : "/student"}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#C4B5FD] hover:bg-white/10"
          >
            <MentrixaVocabIcon name={CANONICAL_PROFILE_ICON} size={14} surface="dark" title="Back" />
            {isOwnProfile ? "Guide home" : "Back"}
          </Link>
        </div>

        <KokonutGlass className="mb-3 p-4 sm:p-5">
          <GuidePublicProfileHeader
            name={profile.name}
            avatarUrl={profile.avatarUrl ?? null}
            emailPrefix={profile.email.split("@")[0] ?? profile.name}
            courses={displaySkills}
            guideRank={profile.guideRank}
            responseRatePercent={profile.responseRatePercent ?? null}
            showUpRatePercent={profile.showUpRatePercent ?? null}
          />
        </KokonutGlass>

        <div className="space-y-3">
          <GuidePublicImpactChipsSection entries={impactNodeScores} />

          {profile.teachingPortfolio ? (
            <GuidePublicPortfolioSection
              cards={profile.teachingPortfolio.cards}
              hasMore={profile.teachingPortfolio.hasMore}
              guideId={profile.id}
            />
          ) : null}

          <GuidePublicBookingSection
            slots={profile.availability}
            tutorTimezone={profile.tutorTimezone}
            canBook={!isOwnProfile && viewerRole !== "tutor"}
            onBookSlot={setDialogSlot}
            formatPrice={(baseCents) => formatPriceFromBaseSessionCents(baseCents, true)}
          />

          <GuidePublicReviewsSection
            avgRating={profile.avgRating}
            ratingCount={profile.ratingCount}
            ratingDistribution={profile.ratingDistribution}
            reviews={profile.reviews}
          />

          {isOwnProfile && profile.privateSettings ? (
            <TutorProfileFormSection
              initial={profile.privateSettings}
              onSaved={() => router.refresh()}
            />
          ) : null}

          {isOwnProfile ? <AccountSecurityPanel className="mt-3" /> : null}
        </div>
      </main>

      <Dialog open={!!dialogSlot} onOpenChange={(open) => { if (!open) setDialogSlot(null); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-2 border-neutral-900 bg-white p-5 text-neutral-950 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-black">Confirm your session</DialogTitle>
            <DialogDescription className="text-sm text-slate-700">
              Review session time and pricing before continuing to secure Stripe checkout.
            </DialogDescription>
          </DialogHeader>

          {dialogSlot ? (
            <div className="space-y-4 text-base text-black">
              <div>
                <p className="text-xl font-bold text-black">{profile.name}</p>
                <p className="mt-2 text-base font-semibold text-neutral-900">{dialogSlot.course}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {formatSlotRangeInZone(dialogSlot.start_time, dialogSlot.end_time, profile.tutorTimezone)}{" "}
                  · {formatDurationLabel(getSessionDurationMinutes(dialogSlot.start_time, dialogSlot.end_time))}
                </p>
              </div>
              <div className="relative rounded-lg border-2 border-mentrixa-600 bg-mentrixa-50 px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-800">Pricing</p>
                  <PriceBreakdownPopover
                    sessionPriceCents={getStudentSessionCheckoutCents({ momentumSubscriber })}
                    tone="dark"
                  />
                </div>
                <BookingPriceBreakdown sessionPriceCents={getStudentSessionCheckoutCents({ momentumSubscriber })} />
                {bookingLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/85">
                    <p className="text-sm font-semibold text-slate-800">Opening secure checkout…</p>
                  </div>
                ) : null}
              </div>
              {bookingError ? <p className="text-sm font-semibold text-red-800">{bookingError}</p> : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-3 border-t-2 border-neutral-200 pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialogSlot(null)} className="h-11 w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={bookingLoading}
              className="h-11 w-full bg-mentrixa-600 text-base font-semibold text-white hover:bg-mentrixa-700 sm:w-auto"
            >
              {bookingLoading ? "Redirecting…" : "Pay & book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
