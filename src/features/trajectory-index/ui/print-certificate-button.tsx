"use client";

import { Button } from "@/shared/ui/button";

export function PrintCertificateButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print certificate
    </Button>
  );
}
