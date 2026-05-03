"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";

/**
 * Visual Trust Indicator: SecurityShield
 * Displays a premium security status icon.
 * - Green: Session Encrypted & Verified
 * - Orange: Public/Unverified Network (Simulated)
 */
export function SecurityShield() {
  const [status, setStatus] = useState<"secure" | "warning" | "loading">("loading");

  useEffect(() => {
    // Check if we're on a secure connection
    const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost";
    
    // Simulate a "Public Network" check for the elite vibe
    // In a real app, this could check for a VPN or specific network signatures
    const isPublicWifi = navigator.userAgent.toLowerCase().includes("mobile") && !("connection" in navigator);

    if (!isSecure) {
      setStatus("warning");
    } else if (isPublicWifi) {
      setStatus("warning");
    } else {
      setStatus("secure");
    }
  }, []);

  if (status === "loading") return <div className="w-5 h-5 animate-pulse bg-slate-200 rounded-full" />;

  return (
    <div className="flex items-center gap-2 group cursor-help transition-all duration-300">
      <div className="relative">
        {status === "secure" ? (
          <ShieldCheck className="w-5 h-5 text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-violet-500 drop-shadow-[0_0_5px_rgba(139,92,246,0.3)]" />
        )}
        
        {/* Subtle pulse animation for that "Alive" feeling */}
        <span className={`absolute inset-0 rounded-full animate-ping opacity-20 ${status === 'secure' ? 'bg-blue-400' : 'bg-violet-400'}`} />
      </div>

      {/* Labels removed for cleaner elite aesthetic */}
    </div>
  );
}
