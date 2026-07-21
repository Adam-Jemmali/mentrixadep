"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { GuideBookingSlotPicker, type GuideBookingSlot } from "@/features/booking/ui/guide-booking-slot-picker";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_BOOKING_ICON } from "@/shared/icons/vocab-canonical";
import { GUIDE_PUBLIC_COPY } from "@/features/tutor/public-profile-pure";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { cn } from "@/shared/core/utils";

export function GuidePublicBookingSection({
  slots,
  tutorTimezone,
  canBook,
  onBookSlot,
  formatPrice,
}: {
  slots: GuideBookingSlot[];
  tutorTimezone: string;
  canBook: boolean;
  onBookSlot: (slot: GuideBookingSlot) => void;
  formatPrice: (baseCents: number | null) => string;
}) {
  const reduceMotion = useReducedMotion();
  const [selectedSlot, setSelectedSlot] = useState<GuideBookingSlot | null>(null);

  const bookableSlots = useMemo(() => {
    const limit = Date.now() + 14 * 86400000;
    return slots.filter((s) => {
      const t = new Date(s.start_time).getTime();
      return t >= Date.now() && t <= limit;
    });
  }, [slots]);

  return (
    <section id="guide-booking" className="scroll-mt-20">
      <GuideAnimatedSticky variant="taped" staggerIndex={3}>
        <div className="mb-2 flex items-center gap-2">
          <MentrixaVocabIcon name={CANONICAL_BOOKING_ICON} size={18} surface="light" title="Booking" />
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7C3AED]">
            {GUIDE_PUBLIC_COPY.bookingHeading}
          </h2>
        </div>

        <GuideBookingSlotPicker
          slots={bookableSlots}
          tutorTimezone={tutorTimezone}
          canBook={canBook}
          selectOnly
          selectedSlotId={selectedSlot?.id ?? null}
          onBookSlot={setSelectedSlot}
          formatPrice={formatPrice}
        />

        {canBook && bookableSlots.length > 0 ? (
          <motion.button
            type="button"
            disabled={!selectedSlot}
            onClick={() => {
              if (selectedSlot) onBookSlot(selectedSlot);
            }}
            className={cn(
              "mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#6366F1]",
              "bg-[#7C3AED] px-4 py-3 text-sm font-bold text-white shadow-[2px_3px_0_#0B1220]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            whileHover={reduceMotion || !selectedSlot ? undefined : { scale: 1.02, y: -1 }}
            whileTap={reduceMotion || !selectedSlot ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
          >
            <MentrixaVocabIcon name={CANONICAL_BOOKING_ICON} size={16} surface="dark" title="Book" />
            {GUIDE_PUBLIC_COPY.bookingCta}
          </motion.button>
        ) : null}
      </GuideAnimatedSticky>
    </section>
  );
}
