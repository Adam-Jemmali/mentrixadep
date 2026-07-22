"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { Button } from "@/shared/ui/button";
import type { MentrixaCertificationView } from "@/features/certifications/load-certification";

export function CertificationVerifyActions({ cert }: { cert: MentrixaCertificationView }) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cert.verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [cert.verifyUrl]);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
      <Button
        type="button"
        variant="ghost"
        className="h-auto px-3 py-2 text-[13px] font-medium text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#0B1220]"
        asChild
      >
        <Link href={`${cert.verifyUrl}?print=1`} target="_blank" rel="noopener noreferrer">
          <MentrixaVocabIcon name="receipt" size={16} surface="light" title="Download PDF" />
          Download PDF
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => void copyLink()}
        className="h-auto px-3 py-2 text-[13px] font-medium text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#0B1220]"
      >
        <MentrixaVocabIcon name="passport" size={16} surface="light" title="Copy link" />
        {copied ? "Link copied" : "Copy verification link"}
      </Button>
    </div>
  );
}
