"use client";

import { useEffect } from "react";

/** Opens the browser print dialog for PDF save when ?print=1. */
export function CertificationPrintTrigger() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
