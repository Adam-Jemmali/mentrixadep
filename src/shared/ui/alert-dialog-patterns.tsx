"use client";

import type { ReactNode } from "react";
import { AlertDialog, Button as HeroUIButton } from "@heroui/react";
import { cn } from "@/shared/core/utils";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import type { MentrixaAlertStatus } from "@/shared/ui/alert-messages-pure";
import {
  cancelBookingConfirmMessage,
  cancelMomentumRenewalConfirmMessage,
  clearAvatarConfirmMessage,
  resumeMomentumRenewalConfirmMessage,
  type MentrixaConfirmDialogMessage,
} from "@/shared/ui/alert-dialog-messages-pure";

export type MentrixaAlertDialogTone = "light" | "dark";

const TONE_CLASS: Record<MentrixaAlertDialogTone, string> = {
  light: "mentrixa-alert-dialog--light",
  dark: "mentrixa-alert-dialog--dark",
};

export function MentrixaConfirmDialog({
  trigger,
  message,
  tone = "light",
  brandKind = "mentrixa",
  onConfirm,
  confirming = false,
  isOpen,
  onOpenChange,
}: {
  trigger: ReactNode;
  message: MentrixaConfirmDialogMessage;
  tone?: MentrixaAlertDialogTone;
  brandKind?: MentrixaBrandKind;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  confirming?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const backdropProps =
    isOpen !== undefined
      ? { isOpen, onOpenChange }
      : {};

  return (
    <AlertDialog>
      {trigger}
      <AlertDialog.Backdrop
        variant="blur"
        isDismissable={false}
        isKeyboardDismissDisabled
        className="mentrixa-alert-dialog__backdrop"
        {...backdropProps}
      >
        <AlertDialog.Container placement="center" size="sm">
          <AlertDialog.Dialog
            className={cn("mentrixa-alert-dialog", TONE_CLASS[tone], "sm:max-w-md")}
          >
            {(dialog) => (
              <>
                <AlertDialog.CloseTrigger className="mentrixa-alert-dialog__close" />
                <AlertDialog.Header>
                  <AlertDialog.Icon status={message.status}>
                    <MentrixaBrandMark kind={brandKind} size="sm" className="opacity-90" />
                  </AlertDialog.Icon>
                  <AlertDialog.Heading>{message.title}</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>{message.description}</p>
                  <p className="mentrixa-alert-dialog__next-action mt-2 text-sm leading-relaxed">
                    {message.nextAction}
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <HeroUIButton
                    slot="close"
                    variant="tertiary"
                    className="mentrixa-alert-dialog__cancel"
                    isDisabled={confirming}
                  >
                    {message.cancelLabel}
                  </HeroUIButton>
                  <HeroUIButton
                    variant={message.status === "danger" ? "danger" : "primary"}
                    className={cn(
                      "mentrixa-alert-dialog__confirm",
                      message.status === "warning" && "mentrixa-alert-dialog__confirm--warning",
                    )}
                    isDisabled={confirming}
                    onPress={() => {
                      void (async () => {
                        const result = await onConfirm();
                        if (result !== false) {
                          dialog.close();
                        }
                      })();
                    }}
                  >
                    {confirming ? "Working…" : message.confirmLabel}
                  </HeroUIButton>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

export function CancelBookingConfirmDialog({
  refundEligible,
  onConfirm,
  confirming = false,
  trigger,
}: {
  refundEligible: boolean;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  confirming?: boolean;
  trigger: ReactNode;
}) {
  return (
    <MentrixaConfirmDialog
      trigger={trigger}
      message={cancelBookingConfirmMessage(refundEligible)}
      brandKind="guide"
      onConfirm={onConfirm}
      confirming={confirming}
    />
  );
}

export function ClearAvatarConfirmDialog({
  onConfirm,
  confirming = false,
  trigger,
}: {
  onConfirm: () => void | boolean | Promise<void | boolean>;
  confirming?: boolean;
  trigger: ReactNode;
}) {
  return (
    <MentrixaConfirmDialog
      trigger={trigger}
      message={clearAvatarConfirmMessage()}
      brandKind="mentrixer"
      onConfirm={onConfirm}
      confirming={confirming}
    />
  );
}

export function CancelMomentumRenewalConfirmDialog({
  periodEndLabel,
  onConfirm,
  confirming = false,
  trigger,
}: {
  periodEndLabel: string | null;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  confirming?: boolean;
  trigger: ReactNode;
}) {
  return (
    <MentrixaConfirmDialog
      trigger={trigger}
      message={cancelMomentumRenewalConfirmMessage(periodEndLabel)}
      brandKind="mentrixer"
      onConfirm={onConfirm}
      confirming={confirming}
    />
  );
}

export function ResumeMomentumRenewalConfirmDialog({
  periodEndLabel,
  onConfirm,
  confirming = false,
  trigger,
}: {
  periodEndLabel: string | null;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  confirming?: boolean;
  trigger: ReactNode;
}) {
  return (
    <MentrixaConfirmDialog
      trigger={trigger}
      message={resumeMomentumRenewalConfirmMessage(periodEndLabel)}
      brandKind="mentrixer"
      onConfirm={onConfirm}
      confirming={confirming}
    />
  );
}

export type { MentrixaAlertStatus, MentrixaConfirmDialogMessage };
