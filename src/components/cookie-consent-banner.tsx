"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "mentrixa-cookie-consent-v1";
const EEA_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
  "GB",
]);

function getCountryFromLocale(): string | null {
  if (typeof navigator === "undefined") return null;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of langs) {
    const match = raw.match(/-([A-Z]{2})$/i);
    const code = match?.[1];
    if (code) return code.toUpperCase();
  }
  return null;
}

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  const isEuLikeLocale = useMemo(() => {
    const country = getCountryFromLocale();
    if (country && EEA_COUNTRY_CODES.has(country)) return true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    return tz.startsWith("Europe/");
  }, []);

  useEffect(() => {
    if (!isEuLikeLocale) return;
    const existing = window.localStorage.getItem(CONSENT_KEY);
    if (!existing) setShow(true);
  }, [isEuLikeLocale]);

  const accept = () => {
    const oneYearSeconds = 60 * 60 * 24 * 365;
    window.localStorage.setItem(CONSENT_KEY, "accepted");
    document.cookie = `mentrixa_cookie_consent=accepted; Max-Age=${oneYearSeconds}; Path=/; SameSite=Lax`;
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          Mentrixa uses essential cookies and limited analytics to keep sessions reliable and improve learning experience.
          See our{" "}
          <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-2">
            Privacy Policy
          </Link>.
        </p>
        <button
          type="button"
          onClick={accept}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
