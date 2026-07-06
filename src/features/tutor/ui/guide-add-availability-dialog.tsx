"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CreateAvailabilityCard } from "@/shared/ui/create-availability-card";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/shared/ui/dialog";
import { GUIDE_AVAILABILITY_FORM } from "@/features/tutor/guide-home-copy-pure";
import { cn } from "@/shared/core/utils";

type GuideAddAvailabilityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apCalcVerified: boolean;
  defaultTimezone: string;
  sessionDefaultDurationMinutes: number;
  onSlotsCreated: () => void;
};

/** Portaled sheet — opens immediately; avoids HeroUI drawer rendering in page flow. */
export function GuideAddAvailabilityDialog({
  open,
  onOpenChange,
  apCalcVerified,
  defaultTimezone,
  sessionDefaultDurationMinutes,
  onSlotsCreated,
}: GuideAddAvailabilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[180]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 left-auto top-0 z-[200] flex h-dvh w-full max-w-2xl flex-col overflow-hidden border-l border-indigo-200 bg-white shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200",
          )}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{GUIDE_AVAILABILITY_FORM.title}</DialogTitle>
          {open ? (
            <div className="h-full overflow-y-auto">
              <CreateAvailabilityCard
                apCalcVerified={apCalcVerified}
                defaultTimezone={defaultTimezone}
                sessionDefaultDurationMinutes={sessionDefaultDurationMinutes}
                enableAnimations={false}
                className="max-w-none min-h-0 rounded-none border-0 shadow-none"
                onSlotsCreated={onSlotsCreated}
              />
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
