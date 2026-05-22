"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";

export default function ConfirmResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rid = searchParams.get("rid");
  const [target, setTarget] = useState("/auth/reset-password");
  const [unlockIn, setUnlockIn] = useState(2);

  useEffect(() => {
    const current = new URL(window.location.href);
    const query = current.searchParams;
    const hash = new URLSearchParams(current.hash.startsWith("#") ? current.hash.slice(1) : "");
    const qp = new URLSearchParams();
    if (rid) qp.set("rid", rid);
    for (const key of ["code", "token_hash", "type", "error", "error_code", "error_description"]) {
      const v = query.get(key);
      if (v) qp.set(key, v);
    }
    const hashPairs: string[] = [];
    for (const key of ["access_token", "refresh_token", "type", "error", "error_code", "error_description"]) {
      const v = hash.get(key);
      if (v) hashPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
    const q = qp.toString();
    const h = hashPairs.join("&");
    setTarget(`/auth/reset-password${q ? `?${q}` : ""}${h ? `#${h}` : ""}`);
  }, [rid]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setUnlockIn((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const buttonLabel = useMemo(() => {
    if (unlockIn > 0) return `Continue in ${unlockIn}s`;
    return "Continue";
  }, [unlockIn]);

  return (
    <AuthLayout>
      <AuthCard>
        <h2 className="font-display font-bold text-2xl text-text-primary mb-1">Confirm password reset</h2>
        <p className="text-sm text-text-muted mb-6">
          Click continue to securely activate your reset link. This extra step helps protect university-email users from
          scanner bots consuming one-time links.
        </p>
        <Button
          type="button"
          className="btn-primary w-full py-3 text-base"
          disabled={unlockIn > 0}
          onClick={() => {
            sessionStorage.setItem("mx_reset_human_gate_at", String(Date.now()));
            router.replace(target);
          }}
        >
          {buttonLabel}
        </Button>
        <p className="mt-4 text-xs text-text-muted text-center">
          If you use a school email, copy-paste the newest link into your browser or open it on your phone.
        </p>
        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/auth/signin?signin=1" className="text-brand-600 hover:underline font-medium">
            Back to Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

