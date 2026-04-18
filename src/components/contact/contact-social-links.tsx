"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; color: string; children: ReactNode };

function IconDiscord({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 7.022 6.982 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-7.022.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-7.022C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function IconTwitter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}


function getSocialEnv() {
  return {
    discord: process.env.NEXT_PUBLIC_SOCIAL_DISCORD_URL?.trim() ?? "",
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL?.trim() ?? "",
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL?.trim() ?? "",
  };
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

type SocialVariant = "default" | "dark" | "footer";

const baseTile = {
  default:
    "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all",
  dark: "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-slate-200 shadow-sm transition-all backdrop-blur-sm",
  footer:
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.05] text-slate-300 transition-all hover:bg-white/10 hover:text-white",
};

export function ContactSocialLinks({
  className,
  variant = "default",
}: {
  className?: string;
  /** `dark` = landing contact strip; `footer` = compact icons in site footer */
  variant?: SocialVariant;
}) {
  const env = getSocialEnv();
  const items: Item[] = [];

  if (isHttpUrl(env.discord)) {
    items.push({
      href: env.discord,
      label: "Discord",
      color:
        variant === "default"
          ? "hover:bg-[#5865F2]/15 hover:text-[#5865F2] hover:border-[#5865F2]/35"
          : "hover:border-[#5865F2]/50 hover:text-[#93a7ff]",
      children: <IconDiscord className={variant === "footer" ? "h-4 w-4" : "h-6 w-6"} />,
    });
  }
  if (isHttpUrl(env.instagram)) {
    items.push({
      href: env.instagram,
      label: "Instagram",
      color:
        variant === "default"
          ? "hover:bg-gradient-to-br hover:from-purple-500/15 hover:to-orange-400/15 hover:text-pink-400 hover:border-pink-400/30"
          : "hover:border-pink-400/40 hover:text-pink-300",
      children: <IconInstagram className={variant === "footer" ? "h-4 w-4" : "h-6 w-6"} />,
    });
  }
  

  if (isHttpUrl(env.twitter)) {
    items.push({
      href: env.twitter,
      label: "X (Twitter)",
      color:
        variant === "default"
          ? "hover:bg-slate-200/10 hover:text-white hover:border-white/25"
          : "hover:border-white/30 hover:text-white",
      children: <IconTwitter className={variant === "footer" ? "h-3.5 w-3.5" : "h-5 w-5"} />,
    });
  }

  if (items.length === 0) {
    if (variant === "footer") {
      return null;
    }
    return (
      <p
        className={cn(
          "text-sm",
          variant === "dark" ? "text-slate-400" : "text-slate-500",
          className,
        )}
      >
        Social links: set{" "}
        <code
          className={cn(
            "text-xs px-1 py-0.5 rounded",
            variant === "dark" ? "bg-white/10 text-slate-300" : "text-slate-600 bg-slate-100",
          )}
        >
          NEXT_PUBLIC_SOCIAL_*_URL
        </code>{" "}
        in your environment.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", variant === "footer" && "gap-2", className)}>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={item.label}
          aria-label={item.label}
          className={cn(baseTile[variant === "default" ? "default" : variant], item.color)}
        >
          {item.children}
        </Link>
      ))}
    </div>
  );
}
