"use client";

/**
 * ConnectionQualityIndicator — per-participant RTCStatsReport quality badge.
 * Uses RTCPeerConnection.getStats() to derive packet loss and RTT.
 */

import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QualityLevel = "excellent" | "good" | "poor" | "unknown";

interface ConnectionQualityIndicatorProps {
  peerConnection: RTCPeerConnection | null;
  /** Poll interval in ms */
  intervalMs?: number;
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

interface QualityStats {
  rtt: number | null;         // ms
  packetLoss: number | null;  // 0–1
  quality: QualityLevel;
}

async function measurePeerQuality(pc: RTCPeerConnection): Promise<QualityStats> {
  try {
    const stats = await pc.getStats();
    let rtt: number | null = null;
    let packetsLost = 0;
    let packetsReceived = 0;

    stats.forEach((report) => {
      // Inbound RTP — packet loss
      if (report.type === "inbound-rtp" && report.kind === "video") {
        packetsLost += (report as { packetsLost?: number }).packetsLost ?? 0;
        packetsReceived +=
          (report as { packetsReceived?: number }).packetsReceived ?? 0;
      }
      // Candidate pair — RTT
      if (
        report.type === "candidate-pair" &&
        (report as { state?: string }).state === "succeeded"
      ) {
        const pair = report as { currentRoundTripTime?: number };
        if (pair.currentRoundTripTime != null) {
          rtt = Math.round(pair.currentRoundTripTime * 1000);
        }
      }
    });

    const total = packetsLost + packetsReceived;
    const loss = total > 0 ? packetsLost / total : null;

    let quality: QualityLevel = "unknown";
    if (rtt !== null || loss !== null) {
      const badRtt = rtt !== null && rtt > 300;
      const badLoss = loss !== null && loss > 0.08;
      const warnRtt = rtt !== null && rtt > 150;
      const warnLoss = loss !== null && loss > 0.03;

      if (badRtt || badLoss) quality = "poor";
      else if (warnRtt || warnLoss) quality = "good";
      else quality = "excellent";
    }

    return { rtt, packetLoss: loss, quality };
  } catch {
    return { rtt: null, packetLoss: null, quality: "unknown" };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const QUALITY_CONFIG: Record<
  QualityLevel,
  { bars: number; color: string; label: string }
> = {
  excellent: { bars: 3, color: "text-blue-400", label: "Excellent" },
  good: { bars: 2, color: "text-violet-400", label: "Good" },
  poor: { bars: 1, color: "text-white/50", label: "Poor" },
  unknown: { bars: 0, color: "text-white/30", label: "Checking…" },
};

export function ConnectionQualityIndicator({
  peerConnection,
  intervalMs = 4000,
}: ConnectionQualityIndicatorProps) {
  const [stats, setStats] = useState<QualityStats>({
    rtt: null,
    packetLoss: null,
    quality: "unknown",
  });

  useEffect(() => {
    if (!peerConnection) return;
    const poll = async () => {
      const result = await measurePeerQuality(peerConnection);
      setStats(result);
    };
    void poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [peerConnection, intervalMs]);

  const { bars, color, label } = QUALITY_CONFIG[stats.quality];

  return (
    <div
      className={`flex items-center gap-1.5 ${color}`}
      title={`${label}${stats.rtt !== null ? ` · ${stats.rtt}ms RTT` : ""}${
        stats.packetLoss !== null
          ? ` · ${(stats.packetLoss * 100).toFixed(1)}% loss`
          : ""
      }`}
    >
      {/* Signal bars */}
      <div className="flex items-end gap-0.5 h-3.5">
        {[1, 2, 3].map((b) => (
          <div
            key={b}
            className={`w-1 rounded-sm transition-colors duration-300 ${
              b <= bars ? color.replace("text-", "bg-") : "bg-white/15"
            }`}
            style={{ height: `${b * 33}%` }}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

// ─── Compact dot variant (for toolbar) ───────────────────────────────────────

export function ConnectionDot({
  peerConnection,
}: {
  peerConnection: RTCPeerConnection | null;
}) {
  const [quality, setQuality] = useState<QualityLevel>("unknown");

  useEffect(() => {
    if (!peerConnection) return;
    const poll = async () => {
      const r = await measurePeerQuality(peerConnection);
      setQuality(r.quality);
    };
    void poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [peerConnection]);

  const colors: Record<QualityLevel, string> = {
    excellent: "bg-blue-400",
    good: "bg-violet-400",
    poor: "bg-white/50",
    unknown: "bg-white/20",
  };

  return (
    <div
      className={`h-2 w-2 rounded-full ${colors[quality]}`}
      title={`Connection: ${quality}`}
    />
  );
}

// ─── Toolbar quality badge with icon ─────────────────────────────────────────

export function ToolbarQualityBadge({
  peerConnection,
}: {
  peerConnection: RTCPeerConnection | null;
}) {
  const [quality, setQuality] = useState<QualityLevel>("unknown");
  const [rtt, setRtt] = useState<number | null>(null);

  useEffect(() => {
    if (!peerConnection) return;
    const poll = async () => {
      const r = await measurePeerQuality(peerConnection);
      setQuality(r.quality);
      setRtt(r.rtt);
    };
    void poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [peerConnection]);

  const colorMap: Record<QualityLevel, string> = {
    excellent: "text-blue-400",
    good: "text-violet-400",
    poor: "text-white/50",
    unknown: "text-white/30",
  };

  return (
    <div
      className={`flex items-center gap-1 ${colorMap[quality]}`}
      title={rtt !== null ? `RTT: ${rtt}ms` : "Connection quality"}
    >
      <Wifi size={12} strokeWidth={2} />
      {rtt !== null && (
        <span className="text-[9px] tabular-nums">{rtt}ms</span>
      )}
    </div>
  );
}
