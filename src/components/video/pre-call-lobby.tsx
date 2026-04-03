"use client";

/**
 * PreCallLobby — camera/mic test, device selection, connection check, join gate.
 * Shows before the WebRTC peer connection is established.
 * Join button becomes active 5 min before session start time.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { stopMediaStream } from "@/lib/webrtc";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LobbySettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

interface PreCallLobbyProps {
  courseLabel: string;
  partnerLabel: string;
  userRole: "student" | "tutor";
  sessionStartTime?: string | null;
  onJoin: (settings: LobbySettings) => void;
}

type ConnectionQuality = "checking" | "excellent" | "good" | "poor" | "offline";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function minutesUntilStart(startTime: string | null | undefined): number {
  if (!startTime) return -1;
  const ms = new Date(startTime).getTime() - Date.now();
  return Math.round(ms / 60_000);
}

function canJoin(startTime: string | null | undefined): boolean {
  if (!startTime) return true; // no gate when time unknown
  const mins = minutesUntilStart(startTime);
  return mins <= 5;
}

function formatCountdown(mins: number): string {
  if (mins <= 0) return "starting now";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

async function measureConnectionQuality(): Promise<ConnectionQuality> {
  if (!navigator.onLine) return "offline";
  try {
    const start = Date.now();
    await fetch("https://www.gstatic.com/generate_204", {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const rtt = Date.now() - start;
    if (rtt < 150) return "excellent";
    if (rtt < 400) return "good";
    return "poor";
  } catch {
    return "poor";
  }
}

// ─── Device selector ─────────────────────────────────────────────────────────

function DeviceSelector({
  label,
  devices,
  selected,
  onChange,
}: {
  label: string;
  devices: MediaDeviceInfo[];
  selected: string;
  onChange: (id: string) => void;
}) {
  if (devices.length <= 1) return null;

  return (
    <div className="relative">
      <label className="block text-[10px] font-medium uppercase tracking-widest text-white/40 mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-8 text-xs text-white/80 focus:outline-none focus:border-white/25 transition-colors"
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId} className="bg-slate-900">
              {d.label || `Device ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40"
        />
      </div>
    </div>
  );
}

// ─── Connection quality badge ─────────────────────────────────────────────────

function ConnectionBadge({ quality }: { quality: ConnectionQuality }) {
  const config: Record<
    ConnectionQuality,
    { icon: React.ElementType; label: string; color: string }
  > = {
    checking: { icon: Loader2, label: "Checking…", color: "text-white/40" },
    excellent: { icon: Wifi, label: "Excellent", color: "text-emerald-400" },
    good: { icon: Wifi, label: "Good", color: "text-amber-400" },
    poor: { icon: Wifi, label: "Poor", color: "text-red-400" },
    offline: { icon: WifiOff, label: "Offline", color: "text-red-400" },
  };
  const { icon: Icon, label, color } = config[quality];
  return (
    <div className={`flex items-center gap-1.5 text-xs ${color}`}>
      <Icon
        size={13}
        strokeWidth={2}
        className={quality === "checking" ? "animate-spin" : ""}
      />
      <span>{label} connection</span>
    </div>
  );
}

// ─── Audio level visualiser ───────────────────────────────────────────────────

function AudioMeter({ stream }: { stream: MediaStream | null }) {
  const barRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !barRef.current) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const pct = Math.min(100, (avg / 128) * 100 * 2.5);
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      analyser.disconnect();
      source.disconnect();
      void ctx.close();
    };
  }, [stream]);

  return (
    <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        ref={barRef}
        className="h-full rounded-full bg-emerald-400 transition-[width] duration-75"
        style={{ width: "0%" }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PreCallLobby({
  courseLabel,
  partnerLabel,
  userRole,
  sessionStartTime,
  onJoin,
}: PreCallLobbyProps) {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [streamReady, setStreamReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("checking");
  const [joinAllowed, setJoinAllowed] = useState(false);
  const [countdown, setCountdown] = useState<string>("");

  // Check join gate every 10 seconds
  useEffect(() => {
    const update = () => {
      setJoinAllowed(canJoin(sessionStartTime));
      const mins = minutesUntilStart(sessionStartTime);
      if (mins > 5) setCountdown(formatCountdown(mins));
      else setCountdown("");
    };
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [sessionStartTime]);

  // Check connection quality on mount
  useEffect(() => {
    measureConnectionQuality().then(setConnectionQuality);
  }, []);

  // Acquire media stream
  const acquireStream = useCallback(
    async (audioDev?: string, videoDev?: string) => {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      setStreamReady(false);
      setPermissionError(null);

      try {
        const constraints: MediaStreamConstraints = {
          audio: audioEnabled
            ? {
                deviceId: audioDev ? { exact: audioDev } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
          video: videoEnabled
            ? {
                deviceId: videoDev ? { exact: videoDev } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user",
              }
            : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          await videoPreviewRef.current.play().catch(() => {});
        }

        // Enumerate devices (labels available after permission granted)
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));

        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        if (audioTrack) setAudioDeviceId(audioTrack.getSettings().deviceId ?? "");
        if (videoTrack) setVideoDeviceId(videoTrack.getSettings().deviceId ?? "");

        setStreamReady(true);
      } catch (err) {
        setPermissionError(
          err instanceof Error ? err.message : "Could not access camera/microphone."
        );
        setStreamReady(false);
      }
    },
    [audioEnabled, videoEnabled]
  );

  useEffect(() => {
    void acquireStream();
    return () => {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeviceChange = useCallback(
    (kind: "audio" | "video", id: string) => {
      if (kind === "audio") setAudioDeviceId(id);
      else setVideoDeviceId(id);
      void acquireStream(
        kind === "audio" ? id : audioDeviceId,
        kind === "video" ? id : videoDeviceId
      );
    },
    [acquireStream, audioDeviceId, videoDeviceId]
  );

  const toggleAudio = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
    setAudioEnabled((v) => !v);
  }, []);

  const toggleVideo = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
    setVideoEnabled((v) => !v);
  }, []);

  const handleJoin = useCallback(() => {
    // Hand off stream ownership to the VideoCall component
    onJoin({
      audioEnabled,
      videoEnabled,
      audioDeviceId: audioDeviceId || undefined,
      videoDeviceId: videoDeviceId || undefined,
    });
  }, [onJoin, audioEnabled, videoEnabled, audioDeviceId, videoDeviceId]);

  const partnerKind = userRole === "student" ? "Guide" : "Learner";

  return (
    <div className="min-h-screen bg-[#0a0b0e] flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-widest text-white/30 mb-1">
            Mentrixa · Session Room
          </p>
          <h1 className="text-lg font-medium text-white">{courseLabel}</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Waiting for {partnerLabel} ({partnerKind.toLowerCase()})
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">

          {/* Camera preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/8">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                videoEnabled && streamReady ? "opacity-100" : "opacity-0"
              }`}
            />

            {(!videoEnabled || !streamReady) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/8">
                  <VideoOff size={22} className="text-white/40" />
                </div>
              </div>
            )}

            {permissionError && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center max-w-xs">
                  <p className="text-xs text-red-300 leading-relaxed">{permissionError}</p>
                  <button
                    onClick={() => void acquireStream()}
                    className="mt-2 text-xs text-red-200 underline hover:text-white transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Camera/mic controls overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button
                onClick={toggleAudio}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-150 ${
                  audioEnabled
                    ? "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-red-500/40 bg-red-500/15 text-red-300"
                }`}
                aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {audioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-150 ${
                  videoEnabled
                    ? "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-red-500/40 bg-red-500/15 text-red-300"
                }`}
                aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {videoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
              </button>
            </div>
          </div>

          {/* Settings panel */}
          <div className="flex flex-col gap-4">

            {/* Connection quality */}
            <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3">
              <ConnectionBadge quality={connectionQuality} />
            </div>

            {/* Mic level */}
            {streamReady && audioEnabled && (
              <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">
                  Microphone level
                </p>
                <AudioMeter stream={streamRef.current} />
                <p className="text-[10px] text-white/30">
                  Speak to test · echo cancellation on
                </p>
              </div>
            )}

            {/* Device selectors */}
            {(audioDevices.length > 1 || videoDevices.length > 1) && (
              <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 space-y-3">
                <DeviceSelector
                  label="Microphone"
                  devices={audioDevices}
                  selected={audioDeviceId}
                  onChange={(id) => handleDeviceChange("audio", id)}
                />
                <DeviceSelector
                  label="Camera"
                  devices={videoDevices}
                  selected={videoDeviceId}
                  onChange={(id) => handleDeviceChange("video", id)}
                />
              </div>
            )}

            {/* Ready checklist */}
            <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 space-y-2">
              {[
                {
                  label: "Camera ready",
                  ok: streamReady && videoEnabled,
                  warn: !videoEnabled,
                  warnMsg: "Camera off",
                },
                {
                  label: "Microphone ready",
                  ok: streamReady && audioEnabled,
                  warn: !audioEnabled,
                  warnMsg: "Microphone muted",
                },
                {
                  label: "Connection",
                  ok: connectionQuality === "excellent" || connectionQuality === "good",
                  warn: connectionQuality === "poor",
                  warnMsg: "Poor signal",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-white/50">{item.label}</span>
                  {item.warn ? (
                    <span className="text-[10px] text-amber-400">{item.warnMsg}</span>
                  ) : (
                    <span
                      className={`text-[10px] font-medium ${
                        item.ok ? "text-emerald-400" : "text-white/30"
                      }`}
                    >
                      {item.ok ? "✓ Ready" : "Checking…"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Join button */}
            <div>
              {!joinAllowed && countdown && (
                <p className="text-center text-xs text-white/30 mb-2">
                  Available in {countdown}
                </p>
              )}
              <button
                onClick={handleJoin}
                disabled={!joinAllowed || !!permissionError}
                className={`w-full rounded-lg py-3 text-sm font-medium transition-all duration-200 ${
                  joinAllowed && !permissionError
                    ? "bg-white text-slate-900 hover:bg-white/90 active:scale-[0.98]"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                Join Session
              </button>
              {!permissionError && (
                <p className="text-center text-[10px] text-white/20 mt-2">
                  You&apos;re joining as{" "}
                  <span className="text-white/40">
                    {userRole === "student" ? "Learner" : "Guide"}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Waiting room banner — shown when other party hasn't joined */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-white/20 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <p className="text-xs text-white/30">
            Waiting for {partnerLabel} ({partnerKind.toLowerCase()}) to join
          </p>
        </div>
      </div>
    </div>
  );
}
