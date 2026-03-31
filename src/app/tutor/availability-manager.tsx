"use client";

import { useState } from "react";
import { deleteAvailability } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import { formatTimeRange, formatDateShort } from "@/lib/time-format";
import { Badge } from "@/components/ui/badge";

interface Availability {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  price_per_session?: number | null;
  price?: number | null;
}

interface AvailabilityManagerProps {
  availability: Availability[];
}

export function AvailabilityManager({ availability }: AvailabilityManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  async function handleDelete(availabilityId: string) {
    setError(null);
    try {
      await deleteAvailability(availabilityId, viewingAsUserId ?? undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete availability");
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 text-xs text-red-600">
          {error}
        </div>
      )}
      {availability.length === 0 ? (
        <p className="text-xs text-slate-400 py-2.5">
          No availability slots created.
        </p>
      ) : (
        <div>
          {availability.map((slot) => (
            <AvailabilityRow
              key={slot.id}
              slot={slot}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AvailabilityRow({
  slot,
  onDelete,
}: {
  slot: Availability;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirm("Are you sure you want to delete this availability slot?")) {
      setDeleting(true);
      await onDelete(slot.id);
      setDeleting(false);
    }
  }

  const cents = slot.price_per_session ?? slot.price ?? 2500;
  const priceInDollars = cents / 100;
  const dateLabel = formatDateShort(slot.start_time);

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F8FAFC]">
      <div className="flex items-center">
        <span className="font-mono text-xs text-slate-400">
          {dateLabel} ·{" "}
          {formatTimeRange(slot.start_time, slot.end_time)}
        </span>
        <Badge variant="outline" className="ml-2 text-[10px] font-normal">
          {slot.course}
        </Badge>
      </div>
      <div className="flex items-center">
        <span className="text-xs text-slate-400">
          ${priceInDollars.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-3 text-xs text-slate-300 hover:text-red-500"
        >
          x
        </button>
      </div>
    </div>
  );
}
