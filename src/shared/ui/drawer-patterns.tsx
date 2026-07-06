"use client";

import type { ReactNode } from "react";
import { Drawer } from "@heroui/react";
import { cn } from "@/shared/core/utils";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";

export type MentrixaDrawerTone = "light" | "dark" | "workbench";
export type MentrixaDrawerPlacement = "top" | "bottom" | "left" | "right";

const TONE_CLASS: Record<MentrixaDrawerTone, string> = {
  light: "mentrixa-drawer--light",
  dark: "mentrixa-drawer--dark",
  workbench: "mentrixa-drawer--workbench",
};

export function MentrixaDrawer({
  isOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  placement = "right",
  tone = "light",
  brandKind,
  showHandle,
  hideHeader = false,
  className,
  bodyClassName,
  contentClassName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  placement?: MentrixaDrawerPlacement;
  tone?: MentrixaDrawerTone;
  brandKind?: MentrixaBrandKind;
  showHandle?: boolean;
  hideHeader?: boolean;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
}) {
  const handleVisible = showHandle ?? placement === "bottom";

  const panel = (
    <Drawer.Backdrop
      variant="blur"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="mentrixa-drawer__backdrop"
    >
      <Drawer.Content
        placement={placement}
        className={cn("mentrixa-drawer__content", contentClassName)}
      >
        <Drawer.Dialog className={cn("mentrixa-drawer", TONE_CLASS[tone], className)}>
          <Drawer.CloseTrigger className="mentrixa-drawer__close" />
          {handleVisible ? <Drawer.Handle className="mentrixa-drawer__handle" /> : null}
          {!hideHeader && (title || description) ? (
            <Drawer.Header className="mentrixa-drawer__header">
              {brandKind ? (
                <MentrixaBrandMark kind={brandKind} size="xs" className="opacity-85" />
              ) : null}
              {title ? <Drawer.Heading>{title}</Drawer.Heading> : null}
              {description ? (
                <p className="mentrixa-drawer__description text-sm leading-relaxed">{description}</p>
              ) : null}
            </Drawer.Header>
          ) : null}
          <Drawer.Body className={cn("mentrixa-drawer__body", bodyClassName)}>{children}</Drawer.Body>
          {footer ? <Drawer.Footer className="mentrixa-drawer__footer">{footer}</Drawer.Footer> : null}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );

  if (trigger) {
    return (
      <Drawer>
        {trigger}
        {panel}
      </Drawer>
    );
  }

  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
      {panel}
    </Drawer>
  );
}
