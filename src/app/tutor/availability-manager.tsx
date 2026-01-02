"use client";

import { useState } from "react";
import { deleteAvailability } from "@/app/actions/tutor";
import { useRouter } from "next/navigation";
import { CreateAvailabilityForm } from "./create-availability-form";
import { formatDate, formatTimeRange } from "@/lib/time-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Availability {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
}

interface AvailabilityManagerProps {
  availability: Availability[];
}

export function AvailabilityManager({ availability }: AvailabilityManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(availabilityId: string) {
    setError(null);
    try {
      await deleteAvailability(availabilityId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete availability");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">My Availability</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your tutoring schedule
            </p>
          </div>
          <CreateAvailabilityForm />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {availability.length === 0 ? (
          <div className="py-12">
            <p className="text-center text-muted-foreground">
              No availability slots created
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availability.map((slot) => (
              <AvailabilitySlot
                key={slot.id}
                slot={slot}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AvailabilitySlot({
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

  return (
    <div className="border border-border rounded-xl p-5 bg-card flex justify-between items-center hover:border-primary/20 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-lg">
            {slot.course.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-semibold text-lg text-foreground">{slot.course}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(slot.start_time)}
          </p>
          <p className="text-sm font-medium text-primary mt-0.5">
            {formatTimeRange(slot.start_time, slot.end_time)}
          </p>
        </div>
      </div>
      <Button
        onClick={handleDelete}
        disabled={deleting}
        variant="destructive"
        size="sm"
      >
        <Trash2 size={16} className="mr-2" />
        {deleting ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
