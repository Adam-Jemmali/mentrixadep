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
  Loader2,
  ChevronDown,
} from "lucide-react";
import { MentrixaSelect } from "@/shared/ui/select-patterns";
import {
  stopMediaStream,
  isMediaPermissionDenied,
  mapMediaStreamError,
} from "@/features/video/webrtc";
import { BubbleText } from "@/shared/ui/bubble-text";
import { Typewriter } from "@/shared/ui/typewriter";
import Image from "next/image";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";

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
  onBack: () => void;
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
  return "good";
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
    <MentrixaSelect
      tone="video"
      variant="secondary"
      aria-label={label}
      label={label}
      brandKind="mentrixa"
      value={selected}
      onChange={(id) => id && onChange(id)}
      options={devices.map((d) => ({
        id: d.deviceId,
        label: d.label || `Device ${d.deviceId.slice(0, 8)}`,
      }))}
    />
  );
}

// ─── Connection quality badge ─────────────────────────────────────────────────

function ConnectionBadge({ quality }: { quality: ConnectionQuality }) {
  const config: Record<
    ConnectionQuality,
    { icon: React.ElementType; label: string; color: string }
  > = {
    checking: { icon: Loader2, label: "Checking…", color: "text-white/40" },
    excellent: { icon: Wifi, label: "Excellent", color: "text-blue-400" },
    good: { icon: Wifi, label: "Good", color: "text-violet-400" },
    poor: { icon: Wifi, label: "Poor", color: "text-white/50" },
    offline: { icon: WifiOff, label: "Offline", color: "text-white/50" },
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
        className="h-full rounded-full bg-blue-400 transition-[width] duration-75"
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
  onBack,
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
  const [isJoining, setIsJoining] = useState(false);

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

        const fallbackConstraints: MediaStreamConstraints = {
          audio: audioEnabled
            ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : false,
          video: videoEnabled
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstErr) {
          if (isMediaPermissionDenied(firstErr)) {
            throw firstErr;
          }
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }
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
        const msg =
          isMediaPermissionDenied(err)
            ? mapMediaStreamError(err).message
            : err instanceof Error
              ? err.message
              : "Could not access camera/microphone.";
        setPermissionError(msg);
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
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
    } else {
      setAudioEnabled((v) => !v);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
    } else {
      setVideoEnabled((v) => !v);
    }
  }, []);

  const partnerKind = userRole === "student" ? "Guide" : "Mentrixer";
  const cameraReady = streamReady && videoEnabled;
  const microphoneReady = streamReady && audioEnabled;
  const connectionReady =
    connectionQuality === "excellent" || connectionQuality === "good";
  const canJoinNow =
    joinAllowed &&
    !permissionError &&
    cameraReady &&
    microphoneReady &&
    connectionReady;

  const joinHint = !joinAllowed
    ? countdown
      ? `Available in ${countdown}`
      : "Join opens 5 minutes before the session starts"
    : !cameraReady
      ? "Turn your camera on to join"
      : !microphoneReady
        ? "Unmute your microphone to join"
        : !connectionReady
          ? "Connection quality is too weak to join"
          : null;

  const handleJoin = useCallback(() => {
    if (isJoining) return;
    if (!canJoinNow) return;
    setIsJoining(true);

    try {
      onJoin({
        audioEnabled,
        videoEnabled,
        audioDeviceId: audioDeviceId || undefined,
        videoDeviceId: videoDeviceId || undefined,
      });
    } catch {
      setIsJoining(false);
    }
  }, [onJoin, audioEnabled, videoEnabled, audioDeviceId, videoDeviceId, canJoinNow, isJoining]);

  const handleBack = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    onBack();
  }, [onBack]);

  return (
    <div className="min-h-screen bg-[#0a0b0e] flex items-start justify-center overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div
        className="w-full max-w-[1120px] mx-auto"
        style={{
          paddingLeft: "max(0px, env(safe-area-inset-left))",
          paddingRight: "max(0px, env(safe-area-inset-right))",
          paddingTop: "max(0px, env(safe-area-inset-top))",
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
      >

        {/* Header */}
        <div className="mb-5 text-center flex flex-col items-center">
          <div className="w-full flex justify-start mb-4 px-1 sm:px-0">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              <ChevronDown size={14} className="rotate-90" />
              Cancel
            </button>
          </div>

          <div className="mb-4">
             <Image src={MENTRIXA_LOGO_PNG} alt="Mentrixa" width={40} height={40} className="mx-auto drop-shadow-glow" />
          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">
            Session Room
          </p>
          
          <h1 className="text-3xl font-black text-white tracking-tighter mb-1">
            <BubbleText text={courseLabel} />
          </h1>

          <div className="flex items-center gap-2 text-white/40 justify-center mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
              <Image 
                src={userRole === "student" ? "/icons/guide.svg" : "/icons/mentrixer.svg"} 
                alt="" 
                width={14} 
                height={14} 
                className="opacity-60"
              />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Waiting for {partnerLabel}
              </span>
            </div>
            <span className="text-xs text-purple-400 opacity-70">{partnerKind}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">

          {/* Camera preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/8 mx-1 sm:mx-0">
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
          <div className="flex flex-col gap-3 mx-1 sm:mx-0 md:max-h-[calc(100vh-220px)] md:overflow-y-auto md:pr-1">

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
                  ok: cameraReady,
                  warn: !videoEnabled,
                  warnMsg: "Camera off",
                },
                {
                  label: "Microphone ready",
                  ok: microphoneReady,
                  warn: !audioEnabled,
                  warnMsg: "Microphone muted",
                },
                {
                  label: "Connection",
                  ok: connectionReady,
                  warn: connectionQuality === "poor",
                  warnMsg: "Poor signal",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-white/50">{item.label}</span>
                  {item.warn ? (
                    <span className="text-[10px] text-violet-400">{item.warnMsg}</span>
                  ) : (
                    <span
                      className={`text-[10px] font-medium ${
                        item.ok ? "text-blue-400" : "text-white/30"
                      }`}
                    >
                      {item.ok ? "✓ Ready" : "Checking…"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Join button */}
            <div className="mt-auto sticky bottom-0 z-10 rounded-lg border border-white/10 bg-[#0a0b0e]/95 p-2 backdrop-blur-sm">
              {joinHint ? <p className="text-center text-xs text-white/30 mb-2">{joinHint}</p> : null}
              <button
                type="button"
                onClick={handleJoin}
                disabled={!canJoinNow || isJoining}
                className={`w-full rounded-lg py-3 text-sm font-medium transition-all duration-200 ${
                  canJoinNow
                    ? "bg-white text-slate-900 hover:bg-white/90 active:scale-[0.98]"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                {isJoining ? "Joining…" : "Join Session"}
              </button>
              {!permissionError && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Image 
                    src={userRole === "tutor" ? "/icons/guide.svg" : "/icons/mentrixer.svg"} 
                    alt="" 
                    width={12} 
                    height={12} 
                    className="opacity-40"
                  />
                  <p className="text-center text-[10px] text-white/20">
                    You&apos;re joining as{" "}
                    <span className="text-white/40 font-bold uppercase tracking-tight">
                      {userRole === "student" ? "Learner" : "Guide"}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Waiting room banner — shown when other party hasn't joined */}
        <div className="mt-4 hidden lg:flex flex-col items-center justify-center gap-3 py-3 border-t border-white/5 px-2 sm:px-0">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Image 
              src={userRole === "student" ? "/icons/guide.svg" : "/icons/mentrixer.svg"} 
              alt="" 
              width={16} 
              height={16} 
              className="opacity-40"
            />
            <div className="text-xs text-white/30 font-medium">
              <Typewriter 
                text={[`Waiting for ${partnerLabel} (${partnerKind}) to join...`, "Syncing session state...", "Preparing workspace..."]} 
                speed={40} 
                waitTime={3000} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
