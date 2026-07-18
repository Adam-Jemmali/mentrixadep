"use client";

import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
};

/**
 * Logo cursor trail removed for landing performance (low-end / no-GPU).
 * Nav already shows a single Mentrixa logo. Kept as a passthrough for old imports.
 */
export function MentrixaCursor({ children }: Props) {
  return children ?? null;
}

/** @deprecated Use MentrixaCursor — kept for import compatibility. */
export function TechCursor() {
  return null;
}

export default MentrixaCursor;
