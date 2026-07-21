"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient as createBrowserSupabaseClient } from "@/shared/integrations/supabase/client";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import {
  createPeerConnection,
  getUserMedia,
  isMediaPermissionDenied,
  mapMediaStreamError,
  stopMediaStream,
} from "@/features/video/webrtc";
import { checkAndEnforceSessionTiming, leaveVideoRoom } from "@/features/video/video";
import {
  saveSessionAiContext,
  type SessionAiChatLine,
  type SessionAiScreenShareEvent,
  type SessionAiWhiteboardSummary,
} from "@/features/studio-ai/session-ai-context";

/** Prefer excluding the current browser tab from capture to avoid infinite “hall of mirrors” recursion. */
function requestDisplayMediaForSession(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 30, max: 30 },
      cursor: "always",
    } as MediaTrackConstraints,
    audio: false,
    preferCurrentTab: false,
    selfBrowserSurface: "exclude",
  } as Parameters<MediaDevices["getDisplayMedia"]>[0]);
}
import { useRouter } from "next/navigation";
import { MessageSquare, LayoutPanelLeft } from "lucide-react";
import { trackClientEvent } from "@/shared/integrations/use-track";
import {
  PreCallLobby,
  type LobbySettings,
} from "@/features/video/ui/pre-call-lobby";
import { Whiteboard } from "@/features/video/ui/whiteboard";
import { InSessionChat } from "@/features/video/ui/in-session-chat";
import {
  SharedSessionGridPanel,
  SharedSessionGridToggle,
} from "@/features/video/shared-session-grid";
import type { SharedSessionGridPayload } from "@/features/video/load-shared-session-grid";
import { ToolbarQualityBadge } from "@/features/video/ui/connection-quality";
import Image from "next/image";
import { BubbleText } from "@/shared/ui/bubble-text";
import { ParticleTextEffect } from "@/shared/ui/particle-text";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { PostCallSummary } from "@/features/video/ui/post-call-summary";

/** Trigger a browser download so the user keeps a local copy of the recording. */
function downloadBlobToDevice(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Local download failed:", e);
  }
}

/**
 * Whether the participant may leave before server force-end (same rules for tutor and learner).
 * `peerLeftNoticeShown` must only be the debounced “other party left” flag — not raw presence (flaky).
 */
function computeSessionLeaveAllowed(params: {
  bypassSessionTimeLock: boolean;
  sessionEndTime: string | null | undefined;
  finalMinuteMode: boolean;
  peerLeftNoticeShown: boolean;
}): boolean {
  if (params.bypassSessionTimeLock) return true;

  const now = Date.now();
  const endMs = params.sessionEndTime ? new Date(params.sessionEndTime).getTime() : NaN;
  const hasValidEnd = Number.isFinite(endMs) && endMs > 0;
  const sessionEndedClock = hasValidEnd && now >= endMs;
  const remainingSec = hasValidEnd ? Math.floor((endMs - now) / 1000) : Number.POSITIVE_INFINITY;
  const inScheduledFinalMinute =
    hasValidEnd && remainingSec <= 60 && remainingSec >= 0;

  if (
    params.finalMinuteMode ||
    params.peerLeftNoticeShown ||
    inScheduledFinalMinute ||
    sessionEndedClock
  ) {
    return true;
  }

  const waitingOnSchedule =
    (hasValidEnd && now < endMs) || (!hasValidEnd && !params.finalMinuteMode && !params.peerLeftNoticeShown);

  return !waitingOnSchedule;
}

function humanizeRecordingError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes("network") || m.includes("failed to fetch")) {
      return "Network error while saving to the cloud. Check your connection — a copy should still be on your device.";
    }
    if (m.includes("unexpected response")) {
      return "The server could not finish the upload (often a timeout on large recordings). Your copy in Downloads is still safe.";
    }
    return err.message;
  }
  return "Something went wrong while processing the recording.";
}

type RecordingUploadResult = {
  success: boolean;
  recording?: { id?: string; file_name?: string };
  error?: string;
};

/** Route Handler upload avoids the default Server Actions ~1MB body cap on multipart recordings. */
async function uploadRecordingViaApi(formData: FormData): Promise<RecordingUploadResult> {
  const res = await fetch("/api/recordings/upload", {
    method: "POST",
    body: formData,
  });

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg =
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `Upload failed (${res.status})`;
    return { success: false, error: msg };
  }

  if (parsed && typeof parsed === "object" && "success" in parsed) {
    return parsed as RecordingUploadResult;
  }

  return { success: false, error: "Unexpected server response while uploading recording." };
}

/** True if the remote MediaStream still has at least one live track (stronger signal than presence during reconnects). */
function remoteMediaHasLiveTrack(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream.getTracks().some((t) => t.readyState === "live");
}

function presenceHasOtherParticipant(
  channel: RealtimeChannel | null,
  selfUserId: string,
): boolean {
  if (!channel) return false;
  try {
    return Object.keys(channel.presenceState()).some((k) => k !== selfUserId);
  } catch {
    return false;
  }
}

/** WebRTC still looks like an active session (avoid false "peer left" on presence flake). */
function peerTransportLooksHealthy(pc: RTCPeerConnection | null): boolean {
  if (!pc) return false;
  const cs = pc.connectionState;
  const ice = pc.iceConnectionState;
  if (cs === "failed" || cs === "closed") return false;
  if (ice === "failed" || ice === "closed") return false;
  return (
    cs === "connected" ||
    ice === "connected" ||
    ice === "completed"
  );
}

/** Generic WebM type — avoids codec strings in the Blob that confuse some desktop players (e.g. Windows Media Player). */
const WEBM_FILE_TYPE = "video/webm";

/**
 * Assemble WebM from MediaRecorder chunks and patch Segment Info Duration (wall-clock ms).
 * Vendored `fix-webm-duration` is modified to never overwrite TimecodeScale (avoids decode/sync bugs).
 * Without Duration, many desktop players show 0:00 and snap the play head back on each Play press.
 *
 * Blob type stays generic `video/webm`; encoded codec is unchanged on disk.
 */
async function buildPlayableWebmBlob(
  chunks: Blob[],
  durationMs: number
): Promise<Blob> {
  const raw = new Blob(chunks, { type: WEBM_FILE_TYPE });
  if (chunks.length === 0 || raw.size === 0) {
    return raw;
  }

  const safeMs = Math.max(1, Math.round(Number.isFinite(durationMs) ? durationMs : 1));

  try {
    const mod = await import("@/shared/integrations/vendor/fix-webm-duration.js");
    // CJS bundle: default export is the fixer function
    const fixWebmDuration = (
      mod as unknown as { default?: (b: Blob, ms: number, o?: { logger?: boolean }) => Promise<Blob> }
    ).default ?? (mod as unknown as (b: Blob, ms: number, o?: { logger?: boolean }) => Promise<Blob>);
    const fixed = await fixWebmDuration(raw, safeMs, { logger: false });
    return fixed.size > 0 ? fixed : raw;
  } catch (e) {
    console.warn("fix-webm-duration (vendor) failed, using raw WebM:", e);
    return raw;
  }
}

function isDisplayCaptureVideoTrack(track: MediaStreamTrack | undefined): boolean {
  if (!track || track.kind !== "video") return false;
  const s = track.getSettings() as MediaTrackSettings & {
    displaySurface?: string;
  };
  return (
    s.displaySurface === "monitor" ||
    s.displaySurface === "window" ||
    s.displaySurface === "browser"
  );
}

/** Enough bitrate for sharp screen text at typical capture resolutions (WebM). */
function suggestedScreenCaptureBitrate(track: MediaStreamTrack | undefined): number {
  if (!track) return 8_000_000;
  const s = track.getSettings();
  const w = s.width ?? 1920;
  const h = s.height ?? 1080;
  const pixels = w * h;
  return Math.min(16_000_000, Math.max(4_000_000, Math.floor(pixels * 0.12)));
}

interface VideoCallProps {
  sessionId: string;
  roomId: string;
  roomToken: string;
  userRole: "student" | "tutor";
  userId: string;
  courseLabel: string;
  learnerLabel: string;
  guideLabel: string;
  /** ISO datetime string — used to gate lobby join button ±5 min */
  sessionStartTime?: string | null;
  /** ISO datetime string — used for warning fallback UX if server check is unavailable */
  sessionEndTime?: string | null;
  sharedGridPayload?: SharedSessionGridPayload | null;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function VideoCall({
  sessionId,
  roomId,
  roomToken,
  userRole,
  userId,
  courseLabel,
  learnerLabel,
  guideLabel,
  sessionStartTime,
  sessionEndTime,
  sharedGridPayload = null,
}: VideoCallProps) {
  const router = useRouter();
  const afterCallPath =
    userRole === "tutor" ? "/tutor/sessions-ai" : "/student?sessionsTab=past#sessions-history";

  // ─── Lobby / phase state ───────────────────────────────────────────────────
  const [inLobby, setInLobby] = useState(true);
  const [lobbySettings, setLobbySettings] = useState<LobbySettings | null>(null);

  // ─── Panel state (chat / whiteboard) ─────────────────────────────────────
  const [activePanel, setActivePanel] = useState<"none" | "chat" | "whiteboard" | "grid">("none");
  /** Peer messages received while chat panel is closed (badge on chat icon). */
  const [chatUnreadFromPeer, setChatUnreadFromPeer] = useState(0);

  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  /** True while we are in the realtime room but no one else is in presence yet (before the call links). */
  const [waitingForOtherParticipant, setWaitingForOtherParticipant] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionSecondsRef = useRef(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  /** The actual time the session "started" (when the student first joined). Defaults to scheduled start. */
  const [actualStartTime, setActualStartTime] = useState<Date | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  /** Whether the remote participant is currently sharing their screen. */
  const [remoteIsScreenShare, setRemoteIsScreenShare] = useState(false);
  /** Student (and non-sharing): main video uses contain for remote display-capture so nothing is cropped. */
  const [remoteMainVideoFit, setRemoteMainVideoFit] = useState<"cover" | "contain">("cover");
  const [isPipDragging, setIsPipDragging] = useState(false);
  const [pipPosition, setPipPosition] = useState<{ left: number; top: number } | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [sessionWarning, setSessionWarning] = useState<"60s" | "15s" | null>(null);
  /** Final-minute mode: scheduled end is near; both sides may leave once session time allows. */
  const [finalMinuteMode, setFinalMinuteMode] = useState(false);
  const [showTutorReconnectPrompt, setShowTutorReconnectPrompt] = useState(false);
  const [showStudentReconnectingOverlay, setShowStudentReconnectingOverlay] = useState(false);
  /** After teardown, show wrap-up card before navigating away. */
  const [postCallOverlay, setPostCallOverlay] = useState<{
    durationSeconds: number;
    recordingMode: "hidden" | "saved" | "failed" | "none";
    whiteboardSnapshotUrl: string | null;
    /** Times a recording file was saved to the device (each stop after a captured blob). */
    localRecordingDownloadCount: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<Date | null>(null);
  /** Browser `setInterval` id (`number`); distinct from Node's `Timeout` type when both DOM and @types/node are active. */
  const recordingIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingActiveRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const selectedMimeTypeRef = useRef<string>('video/webm');
  const lastSentOfferRef = useRef<{ type: string; sdp: string | undefined } | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const connectingLineRef = useRef<HTMLDivElement | null>(null);
  const recordingIndicatorRef = useRef<HTMLDivElement | null>(null);
  const pipRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragRafRef = useRef<number | null>(null);
  const pendingPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isStartingRecordingRef = useRef(false);
  /** Resolves when `MediaRecorder` `onstop` has finished (success, error, or duplicate). */
  const recordingStoppedResolveRef = useRef<(() => void) | null>(null);
  const controlActionLockRef = useRef(false);
  const combinedStreamForRecordingRef = useRef<MediaStream | null>(null);
  const recordingDisplayStreamRef = useRef<MediaStream | null>(null);
  /** Live display-capture track while screen sharing (same track sent to the peer). */
  const displayVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  /** Camera track before screen share — used to restore after display ends (getVideoTracks()[0] can be wrong). */
  const cameraTrackBeforeScreenRef = useRef<MediaStreamTrack | null>(null);
  const isSharingScreenRef = useRef(false);
  /** Closed after each recording stops; avoids leaked AudioContexts and broken follow-up recordings. */
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  /** Set immediately before MediaRecorder.start — wall-clock span for upload metadata and logging. */
  const recordingWallClockStartMsRef = useRef<number | null>(null);
  /** True while local user is ending the call — avoids "peer left" when we hung up. */
  const isLeavingRef = useRef(false);
  /** True once this peer connection reached "connected". */
  const callWasConnectedRef = useRef(false);
  /** Only show one "other participant left" notice per session. */
  const peerLeftNoticeShownRef = useRef(false);

  /** Re-render periodically so Leave unlocks when wall clock enters the final minute without waiting for a poll. */
  const [leaveGateClock, setLeaveGateClock] = useState(0);
  useEffect(() => {
    if (inLobby) return;
    const id = window.setInterval(() => {
      setLeaveGateClock((n) => n + 1);
    }, 10_000);
    return () => window.clearInterval(id);
  }, [inLobby, sessionId]);

  const manualLeaveAllowed = useMemo(
    () =>
      computeSessionLeaveAllowed({
        bypassSessionTimeLock: false,
        sessionEndTime,
        finalMinuteMode,
        peerLeftNoticeShown: peerLeftNoticeShownRef.current,
      }),
    [sessionEndTime, finalMinuteMode, notice, leaveGateClock],
  );

  /** After Supabase channel.track — safe to interpret presence as "in room". */
  const realtimeRoomJoinedRef = useRef(false);
  const lastRealtimeStatusRef = useRef<string | null>(null);
  const chatTranscriptRef = useRef<SessionAiChatLine[]>([]);
  const latestChatMessagesRef = useRef<SessionAiChatLine[]>([]);
  /** Bridges session chat broadcasts (registered on the channel with signaling) into InSessionChat. */
  const inSessionChatBroadcastRef = useRef<((raw: unknown) => void) | null>(null);
  /** Count of peer-authored messages considered "read" (user had chat open through that count). */
  const readPeerChatCountRef = useRef(0);
  const activePanelRef = useRef<"none" | "chat" | "whiteboard" | "grid">(activePanel);
  const whiteboardSummaryRef = useRef<SessionAiWhiteboardSummary | null>(null);
  const screenShareTimelineRef = useRef<SessionAiScreenShareEvent[]>([]);
  const recordingHintsRef = useRef<Record<string, unknown>>({});
  const sessionWarningSentRef = useRef<{ sixty: boolean; fifteen: boolean }>({
    sixty: false,
    fifteen: false,
  });
  const sessionForceEndedRef = useRef(false);
  /** Cleared when the call ends so server timing polls stop racing teardown / uploads. */
  const sessionTimingPollIntervalRef = useRef<number | null>(null);
  const sessionTimingPollInFlightRef = useRef(false);
  /** True after we commit to ending this video session (blocks duplicate handleEndCall). */
  const videoSessionTeardownStartedRef = useRef(false);
  const peerLeftTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    videoSessionTeardownStartedRef.current = false;
    sessionForceEndedRef.current = false;
    sessionWarningSentRef.current = { sixty: false, fifteen: false };
  }, [sessionId]);

  const handleInSessionChatMessagesChange = useCallback(
    (messages: SessionAiChatLine[]) => {
      chatTranscriptRef.current = messages;
      latestChatMessagesRef.current = messages;
      const peerCount = messages.filter((m) => m.authorId !== userId).length;
      if (activePanelRef.current === "chat") {
        readPeerChatCountRef.current = peerCount;
        setChatUnreadFromPeer(0);
      } else {
        setChatUnreadFromPeer(Math.max(0, peerCount - readPeerChatCountRef.current));
      }
    },
    [userId],
  );

  const persistTutorSessionAiContext = useCallback(async () => {
    if (userRole !== "tutor") return;

    const payload = {
      sessionId,
      chatTranscript: chatTranscriptRef.current,
      whiteboardSummary: whiteboardSummaryRef.current,
      whiteboardSnapshotDataUrl: whiteboardSnapshot,
      screenShareTimeline: screenShareTimelineRef.current,
      recordingHints: recordingHintsRef.current,
    };

    const res = await saveSessionAiContext(payload);
    if (!res.ok) {
      console.warn("[video-call] saveSessionAiContext failed:", res.error);
    }
  }, [sessionId, userRole, whiteboardSnapshot]);

  function trackRealtimeStatus(status: string, channelName: string) {
    if (lastRealtimeStatusRef.current === status) return;
    lastRealtimeStatusRef.current = status;

    if (status === "SUBSCRIBED") {
      trackClientEvent("realtime_reconnect", {
        channel: channelName,
        reason: "subscribed",
      });
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      trackClientEvent("realtime_disconnect", {
        channel: channelName,
        reason: status.toLowerCase(),
      });
    }
  }

  const runControlAction = (fn: () => void) => {
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    if (controlActionLockRef.current) return;
    controlActionLockRef.current = true;
    try {
      fn();
    } finally {
      window.setTimeout(() => {
        controlActionLockRef.current = false;
      }, 180);
    }
  };

  function closeRecordingAudioContext() {
    const ctx = recordingAudioContextRef.current;
    recordingAudioContextRef.current = null;
    if (ctx && ctx.state !== "closed") {
      void ctx.close().catch(() => { });
    }
  }

  function stopRecordingCanvasLoop() {
    recordingActiveRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  /** After recording stops, video elements can lose sync with live WebRTC streams — reattach like screen-share `onended`. */
  function rebindVideoElementsAfterRecording() {
    requestAnimationFrame(() => {
      try {
        const displayTrack = displayVideoTrackRef.current;
        if (
          isSharingScreenRef.current &&
          displayTrack &&
          displayTrack.readyState === "live"
        ) {
          const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
          const preview = new MediaStream([displayTrack, ...audioTracks]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = preview;
            void remoteVideoRef.current.play().catch(() => { });
          }
          if (localVideoRef.current && remoteStreamRef.current) {
            localVideoRef.current.srcObject = remoteStreamRef.current;
            void localVideoRef.current.play().catch(() => { });
          }
          return;
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          void remoteVideoRef.current.play().catch(() => { });
        }
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          void localVideoRef.current.play().catch(() => { });
        }
      } catch (e) {
        console.warn("rebindVideoElementsAfterRecording:", e);
      }
    });
  }

  const handleEndCall = async (options?: { bypassSessionTimeLock?: boolean }) => {
    if (videoSessionTeardownStartedRef.current) return;

    setIsLeaving(true);
    isLeavingRef.current = true;

    try {
      // Manual leave: same time gate for tutor and learner (final 60s, scheduled end passed, or debounced peer-left only).
      if (
        !options?.bypassSessionTimeLock &&
        !computeSessionLeaveAllowed({
          bypassSessionTimeLock: false,
          sessionEndTime,
          finalMinuteMode,
          peerLeftNoticeShown: peerLeftNoticeShownRef.current,
        })
      ) {
        const endMs = sessionEndTime ? new Date(sessionEndTime).getTime() : NaN;
        const endStr = Number.isFinite(endMs)
          ? new Date(endMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null;
        setNotice({
          kind: "error",
          message: endStr
            ? `Session is active until ${endStr}. Stay in the room until the last minute of the scheduled time (or until your guide ends the call) — then you can leave.`
            : "Stay in the call until the last minute of your scheduled session (or until your guide leaves). You can leave once the timer allows.",
        });
        setIsLeaving(false);
        isLeavingRef.current = false;
        return;
      }

      videoSessionTeardownStartedRef.current = true;
      // Leave wins over in-flight Share/Record locks; their delayed `finally` will not clear this if teardown is set.
      controlActionLockRef.current = false;
      const durationForSummary = sessionSecondsRef.current;
      const whiteboardForSummary = whiteboardSnapshot;

      if (sessionTimingPollIntervalRef.current != null) {
        window.clearInterval(sessionTimingPollIntervalRef.current);
        sessionTimingPollIntervalRef.current = null;
      }

      setError(null);
      setSessionWarning(null);

      setWaitingForOtherParticipant(false);

      const mr = mediaRecorderRef.current;
      if (mr && (mr.state === "recording" || mr.state === "paused")) {
        await stopRecording();
      }

      try {
        displayVideoTrackRef.current?.stop();
      } catch {
        /* ignore */
      }
      displayVideoTrackRef.current = null;
      try {
        recordingDisplayStreamRef.current?.getTracks().forEach((t) => {
          if (t.readyState !== "ended") t.stop();
        });
      } catch {
        /* ignore */
      }
      recordingDisplayStreamRef.current = null;
      setIsSharingScreen(false);
      isSharingScreenRef.current = false;

      stopMediaStream(localStreamRef.current);

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      try {
        await leaveVideoRoom(sessionId);
      } catch (leaveErr) {
        console.warn("[video-call] leaveVideoRoom:", leaveErr);
      }

      if (channelRef.current) {
        trackClientEvent("realtime_disconnect", {
          channel: channelRef.current.topic,
          reason: "manual_end_call",
        });
        try {
          await channelRef.current.untrack();
        } catch (err) {
          console.warn("Error untracking presence:", err);
        }
        try {
          channelRef.current.unsubscribe();
        } catch (err) {
          console.warn("Error unsubscribing channel:", err);
        }
      }
      setRealtimeChannel(null);

      try {
        await persistTutorSessionAiContext();
      } catch (persistErr) {
        console.warn("[video-call] persistTutorSessionAiContext:", persistErr);
      }

      let recordingMode: "hidden" | "saved" | "failed" | "none" = "hidden";
      let localRecordingDownloadCount = 0;
      if (userRole === "tutor") {
        const hints = recordingHintsRef.current;
        const st = hints.uploadStatus;
        const started = hints.recordingStartedAt != null;
        if (st === "success") recordingMode = "saved";
        else if (st === "failed") recordingMode = "failed";
        else if (started) recordingMode = "failed";
        else recordingMode = "none";
        localRecordingDownloadCount =
          typeof hints.localRecordingDownloadCount === "number"
            ? hints.localRecordingDownloadCount
            : 0;
      }

      setPostCallOverlay({
        durationSeconds: durationForSummary,
        recordingMode,
        whiteboardSnapshotUrl: whiteboardForSummary,
        localRecordingDownloadCount,
      });
    } catch (err) {
      videoSessionTeardownStartedRef.current = false;
      console.error("Error ending call:", err);
      setNotice({
        kind: "info",
        message: "The call ended with a cleanup issue. You can close this tab or return home.",
      });
      router.push(afterCallPath);
    } finally {
      controlActionLockRef.current = false;
      setIsLeaving(false);
      isLeavingRef.current = false;
    }
  };

  // Initialize Supabase client for Realtime
  useEffect(() => {
    try {
      supabaseRef.current = createBrowserSupabaseClient();
    } catch {
      supabaseRef.current = null;
      setConnectionStatus("error");
      setError(
        "Video signaling is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.",
      );
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      setRealtimeChannel(null);
    };
  }, []);

  useEffect(() => {
    const prevBackground = document.body.style.background;
    const prevOverflow = document.body.style.overflow;
    document.body.style.background = "#000";
    document.body.style.overflow = inLobby ? "" : "hidden";
    return () => {
      document.body.style.background = prevBackground;
      document.body.style.overflow = prevOverflow;
    };
  }, [inLobby]);

  // Update session timer based on actual start time (student join anchor)
  useEffect(() => {
    const interval = setInterval(() => {
      const anchor = actualStartTime || (sessionStartTime ? new Date(sessionStartTime) : new Date());
      const now = new Date();
      const diff = Math.floor((now.getTime() - anchor.getTime()) / 1000);
      const next = Math.max(0, diff);
      sessionSecondsRef.current = next;
      setSessionSeconds(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [actualStartTime, sessionStartTime]);

  useEffect(() => {
    isSharingScreenRef.current = isSharingScreen;
  }, [isSharingScreen]);

  useGsapEffect((gsap) => {
    if (connectionStatus !== "connecting" || !connectingLineRef.current) return;
    const line = connectingLineRef.current;
    gsap.to(line, {
      scaleX: 0,
      duration: 0.8,
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
      transformOrigin: "left",
    });
    return () => {
      gsap.killTweensOf(line);
      gsap.set(line, { clearProps: "all" });
    };
  }, [connectionStatus]);

  useGsapEffect((gsap) => {
    if (isRecording && recordingIndicatorRef.current) {
      gsap.fromTo(
        recordingIndicatorRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.5, transformOrigin: "left" },
      );
    }
  }, [isRecording]);

  useGsapEffect((gsap) => {
    if (!controlsRef.current) return;
    gsap.set(controlsRef.current, { opacity: 1 });

    const showControls = () => {
      if (!controlsRef.current) return;
      gsap.to(controlsRef.current, { opacity: 1, duration: 0.3 });
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (controlsRef.current) {
          gsap.to(controlsRef.current, { opacity: 0, duration: 0.5 });
        }
      }, 3000);
    };

    const onMouseEnterControls = () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };

    document.addEventListener("mousemove", showControls);
    document.addEventListener("touchstart", showControls, { passive: true });
    const controlsEl = controlsRef.current;
    controlsEl?.addEventListener("mouseenter", onMouseEnterControls);
    showControls();

    return () => {
      document.removeEventListener("mousemove", showControls);
      document.removeEventListener("touchstart", showControls);
      controlsEl?.removeEventListener("mouseenter", onMouseEnterControls);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pipPosition) {
      const width = 200;
      const height = 120;
      const marginRight = 24;
      const marginBottom = 96;
      setPipPosition({
        left: Math.max(8, window.innerWidth - width - marginRight),
        top: Math.max(56, window.innerHeight - height - marginBottom),
      });
    }
  }, [pipPosition]);

  // Ensure local video stream is displayed when available (re-attach when stream becomes ready or controls change)
  useEffect(() => {
    if (isSharingScreen) return;
    if (localStreamRef.current && localVideoRef.current && document.contains(localVideoRef.current)) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        if (!isVideoOff) {
          localVideoRef.current.play().catch((err) => {
            if (!err.message?.includes("play() request was interrupted")) {
              console.error("Error playing local video (useEffect):", err);
            }
          });
        }
      }
    }
  }, [localStreamReady, isMuted, isVideoOff, isSharingScreen]);

  // Store remote stream in a ref to ensure it persists
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Effect to ensure remote video plays when stream is available (both users see remote cam)
  useEffect(() => {
    if (isSharingScreen) return;

    const bindRemote = async () => {
      if (remoteStreamRef.current && remoteVideoRef.current && document.contains(remoteVideoRef.current)) {
        const stream = remoteStreamRef.current;
        // Ensure the track is actually live and enabled
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === "live" && remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
          try {
            await remoteVideoRef.current.play();
          } catch (err) {
            if (err instanceof Error && !err.message.includes("interrupted")) {
              console.warn("[video-call] remoteVideo.play() failed:", err);
            }
          }
        }
      }
    };

    void bindRemote();
  }, [connectionStatus, hasRemoteStream, isSharingScreen, remoteIsScreenShare]);

  const syncRemoteMainVideoFit = useCallback(() => {
    if (isSharingScreen) return;
    const stream = remoteVideoRef.current?.srcObject as MediaStream | null;
    const t = stream?.getVideoTracks()[0];
    setRemoteMainVideoFit(isDisplayCaptureVideoTrack(t) ? "contain" : "cover");
  }, [isSharingScreen]);

  // Server-authoritative timing checks + in-call warnings.
  useEffect(() => {
    if (inLobby) return;

    const checkSessionEnd = window.setInterval(async () => {
      if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
      if (isProcessingRef.current) return;
      if (sessionTimingPollInFlightRef.current) return;
      sessionTimingPollInFlightRef.current = true;
      try {
        const result = await checkAndEnforceSessionTiming(sessionId);

        if (result.warning === "60s" && !sessionWarningSentRef.current.sixty) {
          sessionWarningSentRef.current.sixty = true;
          enterFinalMinuteMode("60s");
          channelRef.current?.send({
            type: "broadcast",
            event: "session-warning",
            payload: { level: "60s", from: userId },
          });
        }

        if (result.warning === "15s" && !sessionWarningSentRef.current.fifteen) {
          sessionWarningSentRef.current.fifteen = true;
          enterFinalMinuteMode("15s");
          channelRef.current?.send({
            type: "broadcast",
            event: "session-warning",
            payload: { level: "15s", from: userId },
          });
        }

        if (result.shouldEnd && !sessionForceEndedRef.current) {
          sessionForceEndedRef.current = true;
          if (!sessionWarningSentRef.current.sixty) {
            sessionWarningSentRef.current.sixty = true;
            enterFinalMinuteMode("60s");
          } else {
            setFinalMinuteMode(true);
          }
          setNotice({
            kind: "info",
            message:
              result.reason === "cancelled"
                ? "This session was cancelled. You can now leave the room."
                : "Session time ended. You can now leave the room whenever you are ready.",
          });
        }
      } catch (error) {
        if (sessionEndTime) {
          const remainingMs = new Date(sessionEndTime).getTime() - Date.now();
          const remainingSec = Math.floor(remainingMs / 1000);
          if (remainingSec <= 60 && !sessionWarningSentRef.current.sixty) {
            sessionWarningSentRef.current.sixty = true;
            enterFinalMinuteMode("60s");
          }
          if (remainingSec <= 15 && !sessionWarningSentRef.current.fifteen) {
            sessionWarningSentRef.current.fifteen = true;
            enterFinalMinuteMode("15s");
          }
        }
        console.warn("Session timing check failed:", error);
      } finally {
        sessionTimingPollInFlightRef.current = false;
      }
    }, 5000);

    sessionTimingPollIntervalRef.current = checkSessionEnd;
    return () => {
      window.clearInterval(checkSessionEnd);
      if (sessionTimingPollIntervalRef.current === checkSessionEnd) {
        sessionTimingPollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionEndTime, userId, inLobby]);

  // Initialize WebRTC and signaling
  useEffect(() => {
    // Wait until the user leaves pre-call lobby so local/remote video elements are mounted.
    if (inLobby) return;

    let mounted = true;

    async function initializeCall() {
      try {
        callWasConnectedRef.current = false;
        peerLeftNoticeShownRef.current = false;
        realtimeRoomJoinedRef.current = false;
        if (mounted) setWaitingForOtherParticipant(false);

        if (process.env.NODE_ENV === "development") console.log("Initializing call...");
        setConnectionStatus("connecting");

        // Get user media — prefer devices chosen in pre-call lobby
        if (process.env.NODE_ENV === "development") console.log("Requesting camera and microphone access...");
        let stream: MediaStream;
        const lbs = lobbySettings;
        if (lbs) {
          if (lbs.audioEnabled === false || lbs.videoEnabled === false) {
            throw new Error("Enable camera and microphone in the lobby before joining.");
          }

          const constraints: MediaStreamConstraints = {
            audio: lbs.audioEnabled
              ? { deviceId: lbs.audioDeviceId ? { exact: lbs.audioDeviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              : false,
            video: lbs.videoEnabled
              ? { deviceId: lbs.videoDeviceId ? { exact: lbs.videoDeviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
              : false,
          };
          const fallbackConstraints: MediaStreamConstraints = {
            audio: lbs.audioEnabled
              ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              : false,
            video: lbs.videoEnabled
              ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
              : false,
          };

          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (firstErr) {
            // Do not re-prompt after an explicit deny — same outcome, avoids noisy double errors.
            if (isMediaPermissionDenied(firstErr)) {
              throw mapMediaStreamError(firstErr);
            }
            // Device IDs can go stale after unplugging; retry without explicit IDs but with same on/off policy.
            try {
              stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            } catch (secondErr) {
              throw mapMediaStreamError(secondErr);
            }
          }
        } else {
          stream = await getUserMedia(true, true);
        }
        if (!mounted) {
          stopMediaStream(stream);
          return;
        }

        console.log("Got media stream:", stream);
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        console.log("Video tracks:", videoTracks.map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState, settings: t.getSettings() })));
        console.log("Audio tracks:", audioTracks.map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState, settings: t.getSettings() })));

        // Verify we have the tracks we need
        if (videoTracks.length === 0) {
          throw new Error("No video track received. Please check your camera permissions.");
        }
        if (audioTracks.length === 0) {
          throw new Error("No audio track received. Please check your microphone permissions.");
        }

        // Ensure tracks are enabled
        videoTracks.forEach(track => {
          if (!track.enabled) {
            console.warn("Video track is disabled, enabling...");
            track.enabled = true;
          }
        });
        audioTracks.forEach(track => {
          if (!track.enabled) {
            console.warn("Audio track is disabled, enabling...");
            track.enabled = true;
          }
        });

        localStreamRef.current = stream;

        // Apply lobby mute/video state
        if (lbs?.audioEnabled === false) {
          stream.getAudioTracks().forEach((t) => { t.enabled = false; });
          setIsMuted(true);
        }
        if (lbs?.videoEnabled === false) {
          stream.getVideoTracks().forEach((t) => { t.enabled = false; });
          setIsVideoOff(true);
        }

        setLocalStreamReady(true);

        // Attach local video immediately if element is already in DOM (camera opens directly)
        if (localVideoRef.current && document.contains(localVideoRef.current)) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => { });
        }

        // Fallback: ensure video element gets stream when it becomes ready
        const setLocalVideo = async () => {
          if (!mounted || !stream) return;

          // Wait for video element to be in DOM
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts && (!localVideoRef.current || !document.contains(localVideoRef.current))) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }

          if (!localVideoRef.current || !document.contains(localVideoRef.current)) {
            console.warn("Local video element not ready yet; stream will attach on next render tick.");
            return;
          }

          try {
            console.log("Setting local video stream to element");

            // Set the stream
            localVideoRef.current.srcObject = stream;

            // Wait for metadata to load
            await new Promise<void>((resolve, reject) => {
              if (!localVideoRef.current) {
                reject(new Error("Video element lost"));
                return;
              }

              const onLoadedMetadata = () => {
                if (localVideoRef.current) {
                  localVideoRef.current.removeEventListener("loadedmetadata", onLoadedMetadata);
                  resolve();
                }
              };

               
              const onError = (_e: Event) => {
                if (localVideoRef.current) {
                  localVideoRef.current.removeEventListener("error", onError);
                  reject(new Error("Video element error"));
                }
              };

              localVideoRef.current.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
              localVideoRef.current.addEventListener("error", onError, { once: true });

              // If already loaded, resolve immediately
              if (localVideoRef.current.readyState >= 1) {
                resolve();
              }
            });

            // Play the video
            await localVideoRef.current.play();
            console.log("Local video playing successfully");

            // Verify video track is actually working
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              console.log("Video track settings:", videoTrack.getSettings());
              console.log("Video track constraints:", videoTrack.getConstraints());
            }
          } catch (err) {
            console.error("Error setting up local video:", err);
            if (err instanceof Error) {
              // Don't set error for autoplay policy issues - video might still work
              if (!err.message.includes("play() request was interrupted")) {
                setError(`Video setup error: ${err.message}`);
              }
            }
          }
        };

        // Set video immediately if element is ready, otherwise wait
        if (localVideoRef.current && document.contains(localVideoRef.current)) {
          setLocalVideo();
        } else {
          // Wait a bit for React to render the element
          setTimeout(() => {
            if (mounted) {
              setLocalVideo();
            }
          }, 200);
        }

        // Fresh merged remote stream each session (avoid stale tracks / wrong stream from last PC)
        remoteStreamRef.current = null;
        setHasRemoteStream(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }

        // Create peer connection
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;

        // Add local stream tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Merge every remote track into one MediaStream. Browsers often fire audio and video separately;
        // assigning event.streams[0] on the first event can bind the main <video> to audio-only → black
        // until a full rebind. Same-stream track additions also need srcObject reset to render.
        pc.ontrack = (event) => {
          console.log("Received remote track:", event.track.kind, event.streams.length);

          if (!mounted) return;

          const track = event.track;

          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          const ms = remoteStreamRef.current;

          const sameKind = ms.getTracks().filter((t) => t.kind === track.kind);
          for (const t of sameKind) {
            if (t.id !== track.id) {
              ms.removeTrack(t);
              try {
                t.stop();
              } catch {
                /* ignore */
              }
            }
          }

          if (!ms.getTracks().some((t) => t.id === track.id)) {
            ms.addTrack(track);
          }

          if (track.kind === "video") {
            track.addEventListener(
              "unmute",
              () => {
                const el = remoteVideoRef.current;
                if (!mounted || !el || el.srcObject !== ms) return;
                void el.play().catch(() => { });
                syncRemoteMainVideoFit();
              },
              { once: true },
            );
          }

          setHasRemoteStream(true);
          setConnectionStatus("connected");
          setWaitingForOtherParticipant(false);

          console.log(
            "Remote stream tracks:",
            ms.getTracks().map((t) => ({ kind: t.kind, id: t.id, enabled: t.enabled })),
          );

          const setRemoteVideo = async () => {
            if (!remoteVideoRef.current) {
              console.warn("Remote video element not ready, retrying...");
              setTimeout(setRemoteVideo, 100);
              return;
            }

            try {
              console.log("Setting remote video stream (merged)...");
              const el = remoteVideoRef.current;
              el.srcObject = null;
              el.srcObject = ms;

              await new Promise<void>((resolve, reject) => {
                if (!remoteVideoRef.current) {
                  reject(new Error("Video element lost"));
                  return;
                }

                const onLoadedMetadata = () => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.removeEventListener("loadedmetadata", onLoadedMetadata);
                    resolve();
                  }
                };

                 
                const onError = (_e: Event) => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.removeEventListener("error", onError);
                    reject(new Error("Video element error"));
                  }
                };

                remoteVideoRef.current.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
                remoteVideoRef.current.addEventListener("error", onError, { once: true });

                if (remoteVideoRef.current.readyState >= 1) {
                  resolve();
                }
              });

              await remoteVideoRef.current.play();
              syncRemoteMainVideoFit();
              console.log("Remote video playing successfully");

              if (peerConnectionRef.current?.connectionState === "connected") {
                setConnectionStatus("connected");
              } else {
                console.log("Waiting for peer connection to be fully connected...");
              }
            } catch (err) {
              console.error("Error setting up remote video:", err);
              if (err instanceof Error && !err.message.includes("play() request was interrupted")) {
                setError(`Failed to display remote video: ${err.message}`);
              }
            }
          };

          setRemoteVideo();
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && supabaseRef.current && channelRef.current) {
            console.log("Sending ICE candidate:", event.candidate.candidate.substring(0, 50));
            channelRef.current.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: {
                candidate: event.candidate.toJSON(),
                from: userId,
              },
            });
          } else if (!event.candidate) {
            console.log("All ICE candidates gathered");
          }
        };

        const cancelPeerLeftNotice = () => {
          if (peerLeftTimeoutRef.current != null) {
            window.clearTimeout(peerLeftTimeoutRef.current);
            peerLeftTimeoutRef.current = null;
          }
          peerLeftNoticeShownRef.current = false;
          setNotice((prev) =>
            prev?.message === "The other participant has left the call." ? null : prev,
          );
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          if (!mounted) return;
          const state = pc.connectionState;
          console.log("Peer connection state changed:", state);

          if (state === "connected") {
            callWasConnectedRef.current = true;
            cancelPeerLeftNotice();
            setWaitingForOtherParticipant(false);
            setConnectionStatus("connected");
            setHasRemoteStream(true);
            setShowTutorReconnectPrompt(false);
            setShowStudentReconnectingOverlay(false);
            channelRef.current?.send({
              type: "broadcast",
              event: "participant-reconnected",
              payload: { from: userId },
            });
            console.log("Peer connection established!");
            console.log("Local tracks:", stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
            if (remoteStreamRef.current) {
              console.log("Remote tracks:", remoteStreamRef.current.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
            }
          } else if (state === "failed" || state === "disconnected" || state === "closed") {
            if (callWasConnectedRef.current && !isLeavingRef.current) {
              // `disconnected` is often transient (ICE restart, network blip). Do not infer "they left"
              // from WebRTC alone — Supabase presence `leave` is authoritative for that toast.
              const treatAsPossiblePeerLoss = state === "failed" || state === "closed";
              console.log(
                treatAsPossiblePeerLoss
                  ? "Peer connection ended — staying in room with local video"
                  : "Peer connection interrupted (may recover) — reconnecting UI",
              );
              channelRef.current?.send({
                type: "broadcast",
                event: "participant-reconnecting",
                payload: { from: userId },
              });
              if (userRole === "tutor") {
                setShowTutorReconnectPrompt(true);
              }
              if (userRole === "student") {
                setShowStudentReconnectingOverlay(true);
              }
              if (treatAsPossiblePeerLoss) {
                if (peerLeftTimeoutRef.current) clearTimeout(peerLeftTimeoutRef.current);
                peerLeftTimeoutRef.current = window.setTimeout(() => {
                  if (!mounted || isLeavingRef.current) return;
                  if (pc.connectionState === "connected") return;

                  // Supabase presence can recover after a PC blip — don't claim they "left".
                  if (presenceHasOtherParticipant(channelRef.current, userId)) {
                    peerLeftTimeoutRef.current = null;
                    return;
                  }
                  if (
                    remoteMediaHasLiveTrack(remoteStreamRef.current) &&
                    peerTransportLooksHealthy(pc)
                  ) {
                    peerLeftTimeoutRef.current = null;
                    return;
                  }

                  if (!peerLeftNoticeShownRef.current) {
                    peerLeftNoticeShownRef.current = true;
                    setNotice({
                      kind: "info",
                      message: "The other participant has left the call.",
                    });
                  }
                  setHasRemoteStream(false);
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null;
                  }
                }, 10000);
              }
            } else if (!callWasConnectedRef.current) {
              // Never connected — only show error for initial connection failure
              if (state === "failed") {
                setConnectionStatus("disconnected");
                setError("Connection failed. Please try refreshing the page.");
              } else if (state === "disconnected") {
                window.setTimeout(() => {
                  if (!mounted) return;
                  if (
                    (pc.connectionState === "disconnected" || pc.connectionState === "failed") &&
                    !callWasConnectedRef.current
                  ) {
                    setConnectionStatus("disconnected");
                    setError("Connection disconnected. Please try refreshing the page.");
                  }
                }, 4000);
              }
            }
          } else if (state === "connecting") {
            setConnectionStatus("connecting");
            console.log("Peer connection in progress:", state);
          }
        };

        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", pc.iceConnectionState);
          if (pc.iceConnectionState === "failed") {
            console.error("ICE connection failed, attempting restart...");
            pc.restartIce();
          }
        };

        // Handle ICE gathering state
        pc.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", pc.iceGatheringState);
        };

        // Subscribe to signaling channel
        if (!supabaseRef.current) {
          throw new Error(
            "Video signaling is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
          );
        }

        const channel = supabaseRef.current.channel(`video-room-${roomId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: userId },
          },
        });

        channelRef.current = channel;
        setRealtimeChannel(channel);

        // Handle incoming offers
        channel.on("broadcast", { event: "offer" }, async (message: unknown) => {
          // Extract payload - Supabase Realtime wraps it
           
          const payload = (message as any).payload || message;

          if (!payload || payload.from === userId) return; // Ignore own messages

          // Extract offer - handle nested structure
          const offerData = payload.offer || payload.payload?.offer;

          if (!offerData) {
            console.error("No offer data in payload:", payload);
            setError("Invalid offer received");
            return;
          }

          // Validate offer has required type property
          if (!offerData.type || offerData.type !== "offer") {
            console.error("Invalid offer type:", offerData);
            setError("Invalid offer format");
            return;
          }

          try {
            // Ensure we're in the right state
            if (pc.signalingState === "closed") {
              console.error("Peer connection is closed");
              return;
            }

            console.log("Received offer, creating answer...");

            await pc.setRemoteDescription(
              new RTCSessionDescription(offerData)
            );

            const answer = await pc.createAnswer();

            console.log("Answer created:", answer.type);

            await pc.setLocalDescription(answer);

            console.log("Sending answer via channel...");
            channel.send({
              type: "broadcast",
              event: "answer",
              payload: {
                answer: {
                  type: answer.type,
                  sdp: answer.sdp,
                },
                from: userId,
              },
            });

            console.log("Answer sent successfully");
          } catch (err) {
            console.error("Error handling offer:", err);
            if (err instanceof Error) {
              setError(`Failed to handle call offer: ${err.message}`);
            } else {
              setError("Failed to handle call offer");
            }
          }
        });

        // Tutor may join after student sent offer; tutor requests it and student re-sends
        channel.on("broadcast", { event: "request-offer" }, (message: { payload?: { from?: string } }) => {
          const payload = message?.payload;
          if (!payload || payload.from === userId) return;
          if (userRole !== "student" || !lastSentOfferRef.current) return;
          const offer = lastSentOfferRef.current;
          console.log("Re-sending offer on request from peer");
          channel.send({
            type: "broadcast",
            event: "offer",
            payload: {
              offer: { type: offer.type, sdp: offer.sdp },
              from: userId,
            },
          });
        });

        // Handle incoming answers
        channel.on("broadcast", { event: "answer" }, async (message: unknown) => {
          // Extract payload - Supabase Realtime wraps it
           
          const payload = (message as any).payload || message;

          if (!payload || payload.from === userId) return;

          // Extract answer - handle nested structure
          const answerData = payload.answer || payload.payload?.answer;

          if (!answerData) {
            console.error("No answer data in payload:", payload);
            setError("Invalid answer received");
            return;
          }

          // Validate answer has required type property
          if (!answerData.type || answerData.type !== "answer") {
            console.error("Invalid answer type:", answerData);
            setError("Invalid answer format");
            return;
          }

          try {
            // Ensure we're in the right state
            if (pc.signalingState === "closed") {
              console.error("Peer connection is closed");
              return;
            }

            if (pc.signalingState !== "have-local-offer") {
              if (pc.signalingState === "stable") {
                console.debug(
                  "Ignoring remote answer: signaling already stable (duplicate or late message)",
                );
              } else {
                console.warn(
                  "Skipping answer: expected have-local-offer, got",
                  pc.signalingState,
                );
              }
              return;
            }

            console.log("Received answer, setting remote description...");
            await pc.setRemoteDescription(
              new RTCSessionDescription(answerData)
            );
            console.log("Answer processed successfully");
          } catch (err) {
            console.error("Error handling answer:", err);
            if (err instanceof Error) {
              const benign =
                err.message.includes("wrong state") ||
                err.message.includes("Called in wrong state");
              if (!benign) {
                setError(`Failed to handle call answer: ${err.message}`);
              }
            } else {
              setError("Failed to handle call answer");
            }
          }
        });

        // Handle ICE candidates
        channel.on("broadcast", { event: "ice-candidate" }, async (message: unknown) => {
          // Extract payload - Supabase Realtime wraps it
           
          const payload = (message as any).payload || message;

          if (!payload || payload.from === userId) return;

          // Extract candidate - handle nested structure
          const candidateData = payload.candidate || payload.payload?.candidate;

          if (!candidateData) {
            console.warn("No candidate data in payload:", payload);
            return;
          }

          try {
            // Ensure we're in the right state
            if (pc.signalingState === "closed") {
              console.warn("Peer connection is closed, ignoring ICE candidate");
              return;
            }

            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          } catch (err) {
            // ICE candidate errors are often non-fatal (e.g., duplicate candidates)
            console.warn("Error adding ICE candidate:", err);
          }
        });

        channel.on("broadcast", { event: "session-warning" }, (message: unknown) => {
           
          const payload = (message as any).payload || message;
          if (!payload || payload.from === userId) return;
          const level = payload.level === "15s" ? "15s" : payload.level === "60s" ? "60s" : null;
          if (!level) return;
          enterFinalMinuteMode(level);
          if (level === "60s") sessionWarningSentRef.current.sixty = true;
          if (level === "15s") sessionWarningSentRef.current.fifteen = true;
        });

        channel.on("broadcast", { event: "participant-reconnecting" }, (message: unknown) => {
           
          const payload = (message as any).payload || message;
          if (!payload || payload.from === userId) return;
          if (userRole === "student") {
            setShowStudentReconnectingOverlay(true);
          }
        });

        channel.on("broadcast", { event: "participant-reconnected" }, (message: unknown) => {
           
          const payload = (message as any).payload || message;
          if (!payload || payload.from === userId) return;
          setShowStudentReconnectingOverlay(false);
          setShowTutorReconnectPrompt(false);
          cancelPeerLeftNotice();
        });

        channel.on("broadcast", { event: "screen-share-started" }, (message: unknown) => {
           
          const payload = (message as any).payload || message;
          if (!payload || payload.from === userId) return;
          setRemoteIsScreenShare(true);
        });

        channel.on("broadcast", { event: "screen-share-stopped" }, (message: unknown) => {
           
          const payload = (message as any).payload || message;
          if (!payload || payload.from === userId) return;
          setRemoteIsScreenShare(false);
        });

        channel.on("broadcast", { event: "recording-available" }, (message: unknown) => {
           
          const payload = (message as any).payload || message;
          if (!payload || !payload.recordingId) return;
          console.log("[video-call] Recording ID received from peer:", payload.recordingId);
          if (userRole === "student" && mounted) {
            setNotice({
              kind: "success",
              message: "Your guide saved the session recording to the library.",
            });
          }
        });

        // Session text chat — same channel/bindings lifecycle as WebRTC signaling (not a separate React effect).
        channel.on("broadcast", { event: "chat" }, (message: unknown) => {
          inSessionChatBroadcastRef.current?.(message);
        });

        // ELITE SYNC: Check for student's first join to anchor the session time
        const checkStudentJoin = async () => {
          if (!supabaseRef.current) return;
          const { data: participants } = await supabaseRef.current
            .from("call_participants")
            .select("joined_at")
            .eq("room_id", roomId)
            .eq("role", "student")
            .order("joined_at", { ascending: true })
            .limit(1);

          if (participants && participants.length > 0) {
            const firstJoin = new Date(participants[0].joined_at);
            setActualStartTime(firstJoin);
          }
        };

        void checkStudentJoin();

        // Also listen for new participants to update anchor in real-time
        channel.on("presence", { event: "join" }, () => {
          void checkStudentJoin();
        });
        let offerSent = false;
        let otherParticipantPresent = false;

        // Track presence of other participant
        channel.on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const participants = Object.keys(state);
          const hasOtherParticipant = participants.some(
            (key) => key !== userId
          );

          console.log("Presence sync:", { participants, hasOtherParticipant, userId });

          if (hasOtherParticipant) {
            cancelPeerLeftNotice();
          }

          if (mounted && realtimeRoomJoinedRef.current) {
            if (callWasConnectedRef.current || isLeavingRef.current) {
              setWaitingForOtherParticipant(false);
            } else {
              setWaitingForOtherParticipant(!hasOtherParticipant);
            }
          }

          if (hasOtherParticipant && !otherParticipantPresent) {
            otherParticipantPresent = true;
            console.log("Other participant detected, ready to exchange offers");

            // If student and haven't sent offer yet, send it now
            if (userRole === "student" && !offerSent) {
              setTimeout(() => {
                if (!offerSent && mounted) {
                  createOffer(pc, channel);
                  offerSent = true;
                }
              }, 500); // Small delay to ensure both are ready
            }

            // If tutor and not connected yet, request offer
            if (userRole === "tutor" && !callWasConnectedRef.current) {
              setTimeout(() => {
                if (mounted && !callWasConnectedRef.current) {
                  console.log("Tutor: requesting offer from student (presence sync)");
                  channel.send({
                    type: "broadcast",
                    event: "request-offer",
                    payload: { from: userId },
                  });
                }
              }, 800);
            }
          }
        });

        channel.on("presence", { event: "join" }, ({ key, newPresences }: { key: string; newPresences: Record<string, unknown>[] }) => {
          console.log("Participant joined:", key, newPresences);
          if (key !== userId) {
            cancelPeerLeftNotice();
            if (mounted) setWaitingForOtherParticipant(false);
            otherParticipantPresent = true;

            // If tutor joins after student OR student joins after tutor, ensure signaling starts
            if (userRole === "tutor" && !callWasConnectedRef.current) {
              console.log("Tutor: requesting offer from newly joined participant");
              channel.send({
                type: "broadcast",
                event: "request-offer",
                payload: { from: userId },
              });
            }

            // If student and haven't sent offer yet, send it now
            if (userRole === "student" && !offerSent) {
              setTimeout(() => {
                if (!offerSent && mounted) {
                  createOffer(pc, channel);
                  offerSent = true;
                }
              }, 500);
            }
          }
        });

        channel.on("presence", { event: "leave" }, ({ key }: { key: string }) => {
          if (!mounted || key === userId || isLeavingRef.current) return;
          if (!callWasConnectedRef.current) return;
          if (peerLeftNoticeShownRef.current) return;
          
          console.log("Presence: other participant left the room (debouncing 10s)");
          if (peerLeftTimeoutRef.current) clearTimeout(peerLeftTimeoutRef.current);
          peerLeftTimeoutRef.current = window.setTimeout(() => {
            if (!mounted || isLeavingRef.current) return;

            // Re-check presence — other may have rejoined during the debounce window.
            if (presenceHasOtherParticipant(channelRef.current, userId)) {
              peerLeftTimeoutRef.current = null;
              return;
            }

            // Presence `leave` often fires on Realtime reconnect while WebRTC is still fine.
            const pcNow = peerConnectionRef.current;
            if (
              remoteMediaHasLiveTrack(remoteStreamRef.current) &&
              peerTransportLooksHealthy(pcNow)
            ) {
              peerLeftTimeoutRef.current = null;
              return;
            }

            peerLeftNoticeShownRef.current = true;
            setNotice({
              kind: "info",
              message: "The other participant has left the call.",
            });
            setHasRemoteStream(false);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          }, 10000);
        });

        // Subscribe to channel and set presence
        await channel.subscribe(async (status: string) => {
          console.log("Channel subscription status:", status);
          trackRealtimeStatus(status, channel.topic);
          if (status === "SUBSCRIBED") {
            // Set presence to indicate we're in the room
            await channel.track({
              userId,
              role: userRole,
              joinedAt: new Date().toISOString(),
            });

            realtimeRoomJoinedRef.current = true;

            const state = channel.presenceState();
            const participants = Object.keys(state);
            const hasOtherParticipant = participants.some(
              (key) => key !== userId
            );

            if (mounted && !callWasConnectedRef.current && !isLeavingRef.current) {
              setWaitingForOtherParticipant(!hasOtherParticipant);
            }

            // Wait a bit for other participant, then create offer if student
            if (userRole === "student") {
              if (hasOtherParticipant) {
                setTimeout(() => {
                  if (!offerSent && mounted) {
                    createOffer(pc, channel);
                    offerSent = true;
                  }
                }, 300);
              } else {
                setTimeout(() => {
                  if (!offerSent && mounted) {
                    console.log("Sending offer after timeout (other participant may join later)");
                    createOffer(pc, channel);
                    offerSent = true;
                  }
                }, 2000);
              }
            } else if (userRole === "tutor" && hasOtherParticipant) {
              // Tutor joined after student; request offer so student re-sends (tutor may have missed it)
              setTimeout(() => {
                if (mounted) {
                  console.log("Tutor: requesting offer from student");
                  channel.send({
                    type: "broadcast",
                    event: "request-offer",
                    payload: { from: userId },
                  });
                }
              }, 400);
            }
          }
        });
      } catch (err) {
        if (mounted) {
          const errorForUi =
            err instanceof Error
              ? isMediaPermissionDenied(err)
                ? mapMediaStreamError(err)
                : err
              : new Error(String(err));
          const errorMsg = errorForUi.message;
          const expectedPermissionIssue =
            isMediaPermissionDenied(err) ||
            /permission denied|microphone permission|camera permission|blocked or cancelled/i.test(
              errorMsg,
            );

          if (expectedPermissionIssue) {
            console.warn("Video call: camera/microphone not available:", errorMsg);
          } else {
            console.error("Error initializing call:", err);
            if (err instanceof Error) {
              console.error("Full error details:", {
                name: err.name,
                message: err.message,
                stack: err.stack,
              });
            }
          }

          setError(errorMsg);

          if (
            errorMsg.toLowerCase().includes("permission") ||
            errorMsg.toLowerCase().includes("denied") ||
            (err instanceof Error &&
              (err.name === "NotAllowedError" || err.name === "PermissionDeniedError"))
          ) {
            setIsRequestingPermission(true);
          } else if (!(err instanceof Error)) {
            setError("Failed to initialize video call");
          }

          setConnectionStatus("error");
        }
      }
    }

    async function createOffer(
      pc: RTCPeerConnection,
      channel: RealtimeChannel
    ) {
      try {
        if (process.env.NODE_ENV === "development") console.log("Creating offer...");

        // Ensure we're in stable state
        if (pc.signalingState !== "stable") {
          console.warn("Peer connection not in stable state:", pc.signalingState);
          // Wait a bit and retry
          setTimeout(() => {
            if (pc.signalingState === "stable" && mounted) {
              createOffer(pc, channel);
            }
          }, 500);
          return;
        }

        // Tracks were already added with addTrack() — do not add extra transceivers here.
        // Duplicate m-lines broke the offerer's (student's) remote video while the answerer still worked.
        const offer = await pc.createOffer();

        console.log("Offer created:", offer.type, offer.sdp?.substring(0, 100));

        await pc.setLocalDescription(offer);

        console.log("Sending offer via channel...");
        const offerPayload = {
          offer: { type: offer.type, sdp: offer.sdp },
          from: userId,
        };
        channel.send({
          type: "broadcast",
          event: "offer",
          payload: offerPayload,
        });
        lastSentOfferRef.current = { type: offer.type, sdp: offer.sdp };
        console.log("Offer sent successfully");
      } catch (err) {
        console.error("Error creating offer:", err);
        if (err instanceof Error) {
          setError(`Failed to start call: ${err.message}`);
        } else {
          setError("Failed to start call");
        }
      }
    }

    initializeCall();

    return () => {
      mounted = false;
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      stopMediaStream(localStreamRef.current);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      setRealtimeChannel(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally initialize call once for identity/session tuple
  }, [sessionId, roomId, roomToken, userRole, userId, inLobby]);

  const toggleMute = () => {
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    if (controlActionLockRef.current || !localStreamRef.current) return;
    runControlAction(() => {
      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const newState = !isMuted;
      audioTracks.forEach((track) => {
        track.enabled = !newState;
      });
      setIsMuted(newState);
      console.log(`[video-call] Audio ${newState ? 'muted' : 'unmuted'}`);
    });
  };

  const toggleVideo = () => {
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    if (controlActionLockRef.current || !localStreamRef.current) return;
    runControlAction(() => {
      const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];
      const newState = !isVideoOff;
      videoTracks.forEach((track) => {
        track.enabled = !newState;
      });
      setIsVideoOff(newState);
      console.log(`[video-call] Video ${newState ? 'off' : 'on'}`);
    });
  };

  const startRecording = async () => {
    if (userRole !== "tutor") return;
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    if (isStartingRecordingRef.current || isRecording || isProcessingRecording || controlActionLockRef.current) {
      console.warn("[video-call] startRecording ignored: already in progress or locked.");
      return;
    }
    if (!localStreamRef.current || !peerConnectionRef.current) {
      setError("Cannot start recording: connection not ready.");
      return;
    }

    if (connectionStatus !== "connected") {
      setError("Wait until the call is fully connected before recording.");
      return;
    }

    const consentOk = window.confirm(
      "Recording consent required: confirm that both parties explicitly agree to this recording."
    );
    if (!consentOk) return;
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;

    controlActionLockRef.current = true;
    isStartingRecordingRef.current = true;
    try {
      console.log("Starting recording...");
      setError(null);
      setNotice(null);

      // ELITE SYNC: Check if we are already sharing our screen. 
      // If so, use the existing track instead of prompting the user again.
      let recordingDisplayStream: MediaStream | null = recordingDisplayStreamRef.current;
      let recordingDisplayTrack: MediaStreamTrack | null | undefined = displayVideoTrackRef.current;

      if (displayVideoTrackRef.current && displayVideoTrackRef.current.readyState === "live") {
        recordingDisplayTrack = displayVideoTrackRef.current;
        console.log("Reusing existing screen share track for recording.");
      } else {
        console.log("No active screen share found for recording, requesting new stream...");
        recordingDisplayStream = await requestDisplayMediaForSession();
        if (videoSessionTeardownStartedRef.current || isLeavingRef.current) {
          recordingDisplayStream.getTracks().forEach((t) => {
            if (t.readyState !== "ended") t.stop();
          });
          return;
        }
        recordingDisplayTrack = recordingDisplayStream.getVideoTracks()[0];
        recordingDisplayStreamRef.current = recordingDisplayStream;

        // AUTO-SHARE: If we just started a screen capture for recording, 
        // automatically share it with the student so the tutor doesn't have to share twice.
        if (!isSharingScreenRef.current) {
          console.log("Automatically initiating screen share with student...");
          void handleShareScreen(recordingDisplayStream);
        }
      }

      if (videoSessionTeardownStartedRef.current || isLeavingRef.current) {
        return;
      }

      if (!recordingDisplayTrack) {
        throw new Error("No display track was returned. Choose a screen/window to record.");
      }

      closeRecordingAudioContext();

       
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      let audioContext: AudioContext | null = null;
      let destination: MediaStreamAudioDestinationNode | null = null;

      try {
        audioContext = new AudioCtx();
        recordingAudioContextRef.current = audioContext;
        destination = audioContext.createMediaStreamDestination();

        if (localStreamRef.current.getAudioTracks().length > 0) {
          audioContext
            .createMediaStreamSource(localStreamRef.current)
            .connect(destination);
        }
        if (remoteStreamRef.current?.getAudioTracks().length) {
          audioContext
            .createMediaStreamSource(remoteStreamRef.current)
            .connect(destination);
        }
      } catch (audioError) {
        console.warn("Audio mixing error:", audioError);
      }

      if (audioContext?.state === "suspended") {
        await audioContext.resume().catch(() => { });
      }

      const combinedStream = new MediaStream();
      combinedStream.addTrack(recordingDisplayTrack);
      recordingHintsRef.current = {
        ...recordingHintsRef.current,
        recordingMode: "tutor-screen-capture",
        recordingStartedAt: Date.now(),
      };

      if (destination && destination.stream.getAudioTracks().length > 0) {
        destination.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
      } else if (localStreamRef.current.getAudioTracks().length > 0) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          combinedStream.addTrack(track.clone());
        });
      }

      combinedStreamForRecordingRef.current = combinedStream;
      canvasRef.current = null;
      canvasStreamRef.current = null;

      console.log("Combined stream tracks:", {
        video: combinedStream.getVideoTracks().length,
        audio: combinedStream.getAudioTracks().length,
        recordingMode: "tutor-screen-capture",
      });

      // Prefer MP4/H.264 when supported (Windows Media Player handles it far better than WebM).
      // Otherwise VP8+Opus WebM — avoid VP9-first; many desktop players show a static frame or refuse seek.
      const mimeTypes = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp8",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log("Selected MIME type:", mimeType);
          break;
        }
      }

      if (!selectedMimeType) {
        console.warn("No supported MIME type found, using default");
        selectedMimeType = 'video/webm'; // Default to webm
      }

      // Store in ref for use in onstop handler
      selectedMimeTypeRef.current = selectedMimeType;

      const videoTrackForBitrate = combinedStream.getVideoTracks()[0];
      const treatAsHighMotion = (videoTrackForBitrate?.getSettings().width ?? 0) > 1600;
      const videoBitsPerSecond = treatAsHighMotion
        ? suggestedScreenCaptureBitrate(videoTrackForBitrate)
        : 2_500_000;

      const options: MediaRecorderOptions = {
        mimeType: selectedMimeType || undefined,
        videoBitsPerSecond,
        audioBitsPerSecond: 128000,
      };

      console.log("Creating MediaRecorder with options:", options);
      console.log("Stream tracks:", {
        video: combinedStream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
        audio: combinedStream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState }))
      });

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      recordingStartTimeRef.current = null;

      mediaRecorder.onstart = () => {
        recordingStartTimeRef.current = new Date();
        setIsRecording(true);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        recordingIntervalRef.current = window.setInterval(() => {
          const t0 = recordingStartTimeRef.current;
          if (!t0) return;
          setRecordingTime(Math.floor((Date.now() - t0.getTime()) / 1000));
        }, 250);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log("Data chunk received:", event.data.size, "bytes");
        }
      };

      mediaRecorder.onstop = async () => {
        recordingActiveRef.current = false;
        isStoppingRef.current = false;

        const combined = combinedStreamForRecordingRef.current;
        combinedStreamForRecordingRef.current = null;

        if (isProcessingRef.current) {
          console.warn("Already processing recording, ignoring duplicate onstop");
          recordingWallClockStartMsRef.current = null;
          return;
        }

        isProcessingRef.current = true;
        setIsProcessingRecording(true);

        const wallEndMs = Date.now();
        const wallStartMs = recordingWallClockStartMsRef.current;
        recordingWallClockStartMsRef.current = null;

        const startedAtIso =
          recordingStartTimeRef.current?.toISOString() ?? new Date().toISOString();

         
        let uploadResult: any = null;
        try {
          console.log("Recording stopped, processing...", {
            chunks: recordedChunksRef.current.length,
            totalSize: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          });

          if (recordedChunksRef.current.length === 0) {
            setError("Recording failed: no data was captured. Try again.");
            setNotice({
              kind: "error",
              message: "No recording data — stay on this page until you stop recording.",
            });
            return;
          }

          const recorderMime = selectedMimeTypeRef.current || WEBM_FILE_TYPE;
          const isMp4 = recorderMime.includes("mp4");
          const extension = isMp4 ? "mp4" : "webm";
          const fileMimeForUpload = recorderMime;

          let durationMs: number;
          if (wallStartMs != null) {
            durationMs = Math.max(1, wallEndMs - wallStartMs);
          } else if (recordingStartTimeRef.current) {
            durationMs = Math.max(1, wallEndMs - recordingStartTimeRef.current.getTime());
          } else {
            durationMs = 1;
          }

          let blob: Blob;
          if (isMp4) {
            blob = new Blob(recordedChunksRef.current, { type: recorderMime });
          } else {
            blob = await buildPlayableWebmBlob(recordedChunksRef.current, durationMs);
          }

          if (blob.size === 0) {
            setError("Recording failed: empty file.");
            setNotice({ kind: "error", message: "Recording file was empty." });
            return;
          }

          const fileName = `mentrixa-session-${sessionId.slice(0, 8)}-${Date.now()}.${extension}`;
          const endedAt = new Date(wallEndMs);

          downloadBlobToDevice(blob, fileName);
          {
            const prev =
              typeof recordingHintsRef.current.localRecordingDownloadCount === "number"
                ? recordingHintsRef.current.localRecordingDownloadCount
                : 0;
            recordingHintsRef.current = {
              ...recordingHintsRef.current,
              localRecordingDownloadCount: prev + 1,
            };
          }

          const file = new File([blob], fileName, {
            type: fileMimeForUpload,
            lastModified: Date.now(),
          });

          const uploadFormData = new FormData();
          uploadFormData.append("sessionId", sessionId);
          uploadFormData.append("roomId", roomId);
          uploadFormData.append("file", file, fileName);
          uploadFormData.append("startedAt", startedAtIso);
          uploadFormData.append("endedAt", endedAt.toISOString());
          uploadFormData.append("mimeType", fileMimeForUpload);
          uploadFormData.append("recordingConsentConfirmed", "true");

          const result = await uploadRecordingViaApi(uploadFormData);
          uploadResult = result;

          if (!result || typeof result !== "object" || !("success" in result)) {
            recordingHintsRef.current = {
              ...recordingHintsRef.current,
              uploadStatus: "unknown",
              durationMs,
            };
            setError(null);
            setNotice({
              kind: "info",
              message:
                `Saved “${fileName}” to your device .`,
            });
            return;
          }

          if (!result.success) {
            recordingHintsRef.current = {
              ...recordingHintsRef.current,
              uploadStatus: "failed",
              uploadError: result.error ?? "Unknown error",
              durationMs,
            };
            setError(null);
            setNotice({
              kind: "error",
              message: `Saved “${fileName}” to your device .`,
            });
            return;
          }

          setError(null);
          recordingHintsRef.current = {
            ...recordingHintsRef.current,
            uploadStatus: "success",
            uploadedFileName: result.recording?.file_name ?? fileName,
            durationMs,
            mimeType: fileMimeForUpload,
          };
          setNotice({
            kind: "success",
            message: `Saved “${fileName}” locally and in Mentrixa (${result.recording?.file_name ?? "library"}). ${fileName.endsWith(".mp4") ? "MP4 usually plays best in Windows Media Player." : "If the picture is frozen or seek fails in Windows Media Player, open the file in Microsoft Edge or the Films & TV app."}`,
          });
          window.setTimeout(() => setNotice(null), 12000);
        } catch (err) {
          console.error("Error processing recording:", err);
          const msg = humanizeRecordingError(err);
          setError(msg);
          setNotice({ kind: "error", message: msg });
        } finally {
          isProcessingRef.current = false;
          setIsProcessingRecording(false);
          recordedChunksRef.current = [];
          recordingStartTimeRef.current = null;
          stopRecordingCanvasLoop();
          closeRecordingAudioContext();
          if (canvasStreamRef.current) {
            canvasStreamRef.current.getTracks().forEach((track) => track.stop());
            canvasStreamRef.current = null;
          }
          // Only stop tracks we added to the recording pipeline (never live camera/mic from the call)
          combined?.getTracks().forEach((track) => {
            if (track.readyState !== "ended") track.stop();
          });
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
          setRecordingTime(0);
          setIsRecording(false);
          recordingStoppedResolveRef.current?.();
          recordingStoppedResolveRef.current = null;

          // ELITE SYNC: Tell the student the recording is now available
          if (recordingHintsRef.current.uploadStatus === "success") {
            channelRef.current?.send({
              type: "broadcast",
              event: "recording-available",
              payload: { recordingId: uploadResult?.recording?.id },
            });
          }

          rebindVideoElementsAfterRecording();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        isStoppingRef.current = false;
        stopRecordingCanvasLoop();
        closeRecordingAudioContext();
        const canvasStream = canvasStreamRef.current;
        if (canvasStream) {
          canvasStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          canvasStreamRef.current = null;
        }
        combinedStreamForRecordingRef.current?.getTracks().forEach((t) => {
          if (t.readyState !== "ended") t.stop();
        });
        combinedStreamForRecordingRef.current = null;
        recordingWallClockStartMsRef.current = null;
        isProcessingRef.current = false;
        setIsProcessingRecording(false);
        setNotice({
          kind: "error",
          message:
            "Recording stopped unexpectedly. Your call is still active — try Record again if needed.",
        });
        setError("Recording error — you can try again.");
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        recordingStoppedResolveRef.current?.();
        recordingStoppedResolveRef.current = null;
        rebindVideoElementsAfterRecording();
      };

      console.log("Starting MediaRecorder with options:", options);
      if (videoSessionTeardownStartedRef.current || isLeavingRef.current) {
        try {
          recordingDisplayTrack.onended = null;
        } catch {
          /* ignore */
        }
        combinedStreamForRecordingRef.current?.getTracks().forEach((t) => {
          if (t.readyState !== "ended") t.stop();
        });
        combinedStreamForRecordingRef.current = null;
        mediaRecorderRef.current = null;
        return;
      }
      bindDisplayTrackEnded(recordingDisplayTrack);
      recordingWallClockStartMsRef.current = Date.now();
      mediaRecorder.start(250);

      await new Promise((resolve) => setTimeout(resolve, 150));

      if (mediaRecorder.state !== "recording") {
        console.error("MediaRecorder failed to start, state:", mediaRecorder.state);
        setError("Failed to start recording. Please try again.");
        recordingWallClockStartMsRef.current = null;
        stopRecordingCanvasLoop();
        closeRecordingAudioContext();
        combinedStreamForRecordingRef.current?.getTracks().forEach((t) => {
          if (t.readyState !== "ended") t.stop();
        });
        combinedStreamForRecordingRef.current = null;
        mediaRecorderRef.current = null;
        return;
      }

      // Fallback if `onstart` never fires (some browsers): start timer from wall clock
      window.setTimeout(() => {
        if (mediaRecorder.state !== "recording") return;
        if (recordingIntervalRef.current) return;
        recordingStartTimeRef.current = recordingStartTimeRef.current ?? new Date();
        setIsRecording(true);
        setRecordingTime(0);
        recordingIntervalRef.current = window.setInterval(() => {
          const t0 = recordingStartTimeRef.current;
          if (!t0) return;
          setRecordingTime(Math.floor((Date.now() - t0.getTime()) / 1000));
        }, 250);
      }, 400);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      recordingWallClockStartMsRef.current = null;
      stopRecordingCanvasLoop();
      closeRecordingAudioContext();
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach((track) => track.stop());
        canvasStreamRef.current = null;
      }
      combinedStreamForRecordingRef.current?.getTracks().forEach((t) => {
        if (t.readyState !== "ended") t.stop();
      });
      combinedStreamForRecordingRef.current = null;
      recordingDisplayStreamRef.current?.getTracks().forEach((t) => {
        if (t.readyState !== "ended") t.stop();
      });
      recordingDisplayStreamRef.current = null;
    } finally {
      isStartingRecordingRef.current = false;
      window.setTimeout(() => {
        if (!videoSessionTeardownStartedRef.current) {
          controlActionLockRef.current = false;
        }
      }, 500); // 500ms safety lockout after start
    }
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (isStoppingRef.current) {
        resolve();
        return;
      }
      const mr = mediaRecorderRef.current;
      if (!mr) {
        resolve();
        return;
      }

      const state = mr.state;
      if (state !== "recording" && state !== "paused") {
        console.warn("MediaRecorder already stopped, state:", state);
        setIsRecording(false);
        recordingActiveRef.current = false;
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setRecordingTime(0);
        resolve();
        return;
      }

      console.log("Stopping recording...");
      isStoppingRef.current = true;
      recordingActiveRef.current = false;
      setIsRecording(false);

      let timeoutId: number | null = null;
      const safeResolve = () => {
        if (timeoutId != null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        recordingStoppedResolveRef.current = null;
        resolve();
      };

      recordingStoppedResolveRef.current = safeResolve;

      timeoutId = window.setTimeout(() => {
        console.warn("Recording pipeline did not finish within 120s; continuing teardown");
        safeResolve();
      }, 120_000);

      try {
        if (mr.state === "recording" || mr.state === "paused") {
          try {
            mr.requestData();
          } catch (rdErr) {
            console.warn("requestData before stop:", rdErr);
          }
        }
        mr.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
        isStoppingRef.current = false;
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setRecordingTime(0);
        safeResolve();
      }
    });
  };

  const enterFinalMinuteMode = useCallback(
    (level: "60s" | "15s") => {
      setSessionWarning((prev) => (prev === "15s" ? "15s" : level));
      setFinalMinuteMode(true);

      if (level === "60s") {
        if (userRole === "tutor") {
          setNotice({
            kind: "info",
            message:
              "Session ends in about a minute. You can keep recording, chatting, and sharing — stop a recording anytime to save a copy to your device. Leave when you are ready (from the final minute onward).",
          });
        } else {
          setNotice({
            kind: "info",
            message:
              "Session ends in about a minute. You can keep talking and chatting — you may leave from the final minute onward.",
          });
        }
        return;
      }

      setNotice({
        kind: "info",
        message:
          userRole === "tutor"
            ? "Session ends in about 15 seconds. Wrap up — you can leave when ready."
            : "Session ends in about 15 seconds. You can leave when ready.",
      });
    },
    [userRole],
  );

  /** Restore camera to the peer and normal PiP layout; optionally stop the display-capture track. */
  async function restorePeerCameraLayout(options: { stopDisplayTrack: boolean }) {
    const displayTrack = displayVideoTrackRef.current;
    setIsSharingScreen(false);
    isSharingScreenRef.current = false;

    channelRef.current?.send({
      type: "broadcast",
      event: "screen-share-stopped",
      payload: { from: userId },
    });

    const pcNow = peerConnectionRef.current;
    const videoSender = pcNow?.getSenders().find((s) => s.track?.kind === "video");
    const cameraTrack =
      cameraTrackBeforeScreenRef.current ??
      localStreamRef.current?.getVideoTracks().find((t) => t.kind === "video" && t.readyState === "live");

    try {
      if (
        pcNow &&
        pcNow.connectionState !== "closed" &&
        videoSender &&
        cameraTrack &&
        cameraTrack.readyState === "live"
      ) {
        await videoSender.replaceTrack(cameraTrack);
      } else if (pcNow && videoSender && localStreamRef.current) {
        const fallback = localStreamRef.current
          .getVideoTracks()
          .find((t) => t.kind === "video" && t.readyState === "live");
        if (fallback) await videoSender.replaceTrack(fallback);
      }
    } catch (e) {
      console.warn("Restoring camera after screen share failed:", e);
    }

    cameraTrackBeforeScreenRef.current = null;

    try {
      if (remoteVideoRef.current && remoteStreamRef.current) {
        const rStream = remoteStreamRef.current;
        if (rStream.getVideoTracks().some((t) => t.readyState === "live")) {
          remoteVideoRef.current.srcObject = rStream;
          void remoteVideoRef.current.play().catch(() => { });
        }
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        void localVideoRef.current.play().catch(() => { });
      }
    } catch (e) {
      console.warn("Restoring video elements after screen share failed:", e);
    }

    if (options.stopDisplayTrack && displayTrack && displayTrack.readyState !== "ended") {
      try {
        displayTrack.onended = null;
        displayTrack.stop();
      } catch {
        /* ignore */
      }
    }
    if (options.stopDisplayTrack) {
      displayVideoTrackRef.current = null;
    }
  }

  function bindDisplayTrackEnded(displayTrack: MediaStreamTrack) {
    displayTrack.onended = () => {
      void (async () => {
        if (videoSessionTeardownStartedRef.current || isLeavingRef.current) {
          try {
            displayTrack.onended = null;
          } catch {
            /* ignore */
          }
          try {
            if (displayVideoTrackRef.current === displayTrack) {
              displayVideoTrackRef.current = null;
            }
            if (displayTrack.readyState !== "ended") displayTrack.stop();
          } catch {
            /* ignore */
          }
          return;
        }
        const mr = mediaRecorderRef.current;
        const recording = mr?.state === "recording" || mr?.state === "paused";
        screenShareTimelineRef.current.push({
          state: "end",
          at: Date.now(),
          actorId: userId,
        });
        if (recording) {
          setNotice({
            kind: "info",
            message: "Screen capture ended. Finalizing recording...",
          });
          await stopRecording();
        }
        if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
        await restorePeerCameraLayout({ stopDisplayTrack: true });
      })();
    };
  }

  /** Stop sending screen to the peer while optionally keeping capture alive for an active recording. */
  async function handleStopScreenShare() {
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    if (controlActionLockRef.current || !peerConnectionRef.current) return;
    if (!isSharingScreenRef.current) return;
    controlActionLockRef.current = true;
    try {
      const mr = mediaRecorderRef.current;
      const recording = mr?.state === "recording" || mr?.state === "paused";
      const displayTrack = displayVideoTrackRef.current;
      const keepCaptureForRecording =
        recording && !!displayTrack && displayTrack.readyState === "live";

      await restorePeerCameraLayout({ stopDisplayTrack: !keepCaptureForRecording });
      if (keepCaptureForRecording && displayTrack) {
        bindDisplayTrackEnded(displayTrack);
      }
    } finally {
      window.setTimeout(() => {
        if (!videoSessionTeardownStartedRef.current) {
          controlActionLockRef.current = false;
        }
      }, 200);
    }
  }

  // Cleanup recording on unmount (do not depend on isRecording — ref state is source of truth)
  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (mr && (mr.state === "recording" || mr.state === "paused")) {
        try {
          mr.requestData();
        } catch {
          /* ignore */
        }
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingDisplayStreamRef.current) {
        recordingDisplayStreamRef.current.getTracks().forEach((track) => track.stop());
        recordingDisplayStreamRef.current = null;
      }
      const ctx = recordingAudioContextRef.current;
      recordingAudioContextRef.current = null;
      if (ctx && ctx.state !== "closed") {
        void ctx.close().catch(() => { });
      }
    };
  }, []);

  const retryPermissionRequest = async () => {
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    setIsRequestingPermission(true);
    setError(null);

    try {
      // Clear any existing stream
      if (localStreamRef.current) {
        stopMediaStream(localStreamRef.current);
        localStreamRef.current = null;
      }

      // Request permissions again
      const stream = await getUserMedia(true, true);
      localStreamRef.current = stream;
      setLocalStreamReady(true);

      // Set video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play();
      }

      // Re-add tracks to peer connection if it exists
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      }

      setConnectionStatus("connecting");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (isMediaPermissionDenied(err) || /permission denied|blocked/i.test(msg)) {
        console.warn("Retry camera/microphone:", msg);
      } else {
        console.error("Error retrying permission:", err);
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to access camera/microphone");
      }
      setConnectionStatus("error");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mm = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const ss = (seconds % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const handleShareScreen = async (existingStream?: MediaStream) => {
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    if (controlActionLockRef.current || !peerConnectionRef.current) return;

    controlActionLockRef.current = true;
    try {
      // ELITE SYNC: If we are already recording or have an existing display stream, 
      // validate if it's still live before reusing.
      const existingDisplayStream = recordingDisplayStreamRef.current;
      const isExistingLive = existingDisplayStream?.getVideoTracks().some(t => t.readyState === "live");

      let displayStream: MediaStream;
      if (existingStream) {
        displayStream = existingStream;
      } else if (isExistingLive && existingDisplayStream) {
        displayStream = existingDisplayStream;
      } else {
        displayStream = await requestDisplayMediaForSession();
        if (videoSessionTeardownStartedRef.current || isLeavingRef.current) {
          displayStream.getTracks().forEach((t) => {
            if (t.readyState !== "ended") t.stop();
          });
          return;
        }
      }

      if (videoSessionTeardownStartedRef.current || isLeavingRef.current) {
        if (!existingStream && displayStream !== existingDisplayStream) {
          displayStream.getTracks().forEach((t) => {
            if (t.readyState !== "ended") t.stop();
          });
        }
        return;
      }

      const displayTrack = displayStream.getVideoTracks()[0];
      if (!displayTrack) {
        throw new Error("No video track returned from screen capture.");
      }

      // If we had a previous display track, stop it to avoid leaks and browser UI confusion
      if (displayVideoTrackRef.current && displayVideoTrackRef.current !== displayTrack) {
        displayVideoTrackRef.current.stop();
      }

      // ELITE SYNC: Re-track existing camera to restore later
      const existingCamera = localStreamRef.current
        ?.getVideoTracks()
        .find((t) => t.kind === "video" && t.readyState === "live");
      cameraTrackBeforeScreenRef.current = existingCamera ?? null;

      const pc = peerConnectionRef.current;
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");

      // Robust track replacement with automatic fallback
      if (videoSender) {
        try {
          await videoSender.replaceTrack(displayTrack);
        } catch (replaceErr) {
          console.error("[video-call] replaceTrack (screen) failed, attempting camera fallback:", replaceErr);
          displayTrack.stop();

          // RECOVERY: If screen share failed to attach, force-restore the camera so the student doesn't see black.
          const cameraTrack = cameraTrackBeforeScreenRef.current ??
            localStreamRef.current?.getVideoTracks().find(t => t.readyState === "live");

          if (cameraTrack) {
            await videoSender.replaceTrack(cameraTrack).catch(e => console.error("[video-call] Fallback failed:", e));
          }

          setIsSharingScreen(false);
          isSharingScreenRef.current = false;
          throw new Error("Screen share connection failed. Reverting to camera for stability.");
        }
      }

      if (videoSessionTeardownStartedRef.current || isLeavingRef.current) {
        try {
          displayTrack.onended = null;
          if (displayTrack.readyState !== "ended") displayTrack.stop();
        } catch {
          /* ignore */
        }
        return;
      }

      displayVideoTrackRef.current = displayTrack;
      screenShareTimelineRef.current.push({
        state: "start",
        at: Date.now(),
        actorId: userId,
      });

      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const preview = new MediaStream([displayTrack, ...audioTracks]);

      // ATOMIC UI SWAP: 
      // Fullscreen main = your screen (1:1 with capture). 
      // PiP = other participant (student).
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = preview;
        void remoteVideoRef.current.play().catch(e => console.warn("Main preview failed:", e));
      }
      if (localVideoRef.current && remoteStreamRef.current) {
        localVideoRef.current.srcObject = remoteStreamRef.current;
        void localVideoRef.current.play().catch(e => console.warn("PiP remote failed:", e));
      }

      setIsSharingScreen(true);
      isSharingScreenRef.current = true;

      // ELITE SYNC: Tell the student we are sharing so they can adjust their layout
      channelRef.current?.send({
        type: "broadcast",
        event: "screen-share-started",
        payload: { from: userId },
      });

      bindDisplayTrackEnded(displayTrack);
    } catch (err) {
      if (isMediaPermissionDenied(err)) {
        console.warn("Screen share: cancelled or blocked by browser.");
      } else {
        console.warn("getDisplayMedia:", err);
      }
      setError(
        err instanceof Error && isMediaPermissionDenied(err)
          ? "Screen sharing was blocked or cancelled."
          : "Screen sharing was cancelled or unavailable.",
      );
    } finally {
      window.setTimeout(() => {
        if (!videoSessionTeardownStartedRef.current) {
          controlActionLockRef.current = false;
        }
      }, 200);
    }
  };

  const handleTutorRejoinAttempt = () => {
    if (userRole !== "tutor") return;
    if (videoSessionTeardownStartedRef.current || isLeavingRef.current) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "participant-reconnecting",
      payload: { from: userId },
    });
    channelRef.current?.send({
      type: "broadcast",
      event: "request-offer",
      payload: { from: userId },
    });
    setNotice({
      kind: "info",
      message: "Reconnect request sent. Waiting for learner response...",
    });
  };

  const handlePipPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = pipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    isDraggingRef.current = true;
    setIsPipDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    el.setPointerCapture(e.pointerId);
  };

  const handlePipPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    pendingPointerPositionRef.current = { x: e.clientX, y: e.clientY };
    if (dragRafRef.current != null) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      if (!pendingPointerPositionRef.current) return;
      const nextLeft = pendingPointerPositionRef.current.x - dragOffsetRef.current.x;
      const nextTop = pendingPointerPositionRef.current.y - dragOffsetRef.current.y;
      setPipPosition({
        left: Math.max(0, Math.min(nextLeft, window.innerWidth - 200)),
        top: Math.max(48, Math.min(nextTop, window.innerHeight - 120)),
      });
    });
  };

  const handlePipPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = pipRef.current;
    isDraggingRef.current = false;
    setIsPipDragging(false);
    if (el) el.releasePointerCapture(e.pointerId);
  };

  // ─── Lobby phase ──────────────────────────────────────────────────────────
  if (inLobby) {
    const partnerLabel =
      userRole === "student" ? guideLabel : learnerLabel;
    return (
      <PreCallLobby
        courseLabel={courseLabel}
        partnerLabel={partnerLabel}
        userRole={userRole}
        sessionStartTime={sessionStartTime}
        onBack={() => {
          router.push(afterCallPath);
        }}
        onJoin={(settings) => {
          setLobbySettings(settings);
          setInLobby(false);
        }}
      />
    );
  }

  if (postCallOverlay) {
    return (
      <PostCallSummary
        sessionId={sessionId}
        userRole={userRole}
        durationSeconds={postCallOverlay.durationSeconds}
        recordingMode={postCallOverlay.recordingMode}
        localRecordingDownloadCount={postCallOverlay.localRecordingDownloadCount}
        whiteboardSnapshotUrl={postCallOverlay.whiteboardSnapshotUrl ?? undefined}
        onClose={() => setPostCallOverlay(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 touch-manipulation bg-[#080C14] overflow-hidden text-white flex flex-col">
      {/* Top bar — no dashboard / shell navigation during the call (leave ends session from toolbar). */}
      <div className="flex-none h-12 z-10 px-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-[rgba(8,12,20,0.8)]">
        <div className="w-24 shrink-0" aria-hidden />
        <p className="text-xs text-white/30 hidden sm:block">
          <BubbleText text={courseLabel} className="mr-2" />
          ·
          <BubbleText text={learnerLabel} className="mx-2" />
          &amp;
          <BubbleText text={guideLabel} className="ml-2" />
        </p>
        <div className="flex items-center gap-3">
          {peerConnectionRef.current && (
            <ToolbarQualityBadge peerConnection={peerConnectionRef.current} />
          )}
          <p className="text-xs font-mono text-white/35 tabular-nums">
            {formatTimer(sessionSeconds)}
          </p>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video area */}
        <div className="relative flex-1 bg-black overflow-hidden">
          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            onLoadedMetadata={syncRemoteMainVideoFit}
            onLoadedData={syncRemoteMainVideoFit}
            className={`w-full h-full transition-all duration-500 ${isSharingScreen || remoteIsScreenShare || remoteMainVideoFit === "contain"
                ? "object-contain"
                : "object-cover"
              }`}
          />

          {/* Sharing indicator for Tutor */}
          {isSharingScreen && (
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2 rounded-full px-3 py-1 bg-blue-500/80 backdrop-blur-md border border-white/20 shadow-lg animate-in fade-in slide-in-from-top-2">
              <LayoutPanelLeft size={12} className="text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                Sharing Screen
              </span>
            </div>
          )}

          {/* PiP self-view */}
          <div
            ref={pipRef}
            className="absolute z-20 w-[180px] h-[112px] rounded-lg overflow-hidden border border-white/10 bg-black shadow-lg"
            style={{
              left: `${pipPosition?.left ?? 16}px`,
              top: `${pipPosition?.top ?? 60}px`,
              cursor: isPipDragging ? "grabbing" : "grab",
            }}
            onPointerDown={handlePipPointerDown}
            onPointerMove={handlePipPointerMove}
            onPointerUp={handlePipPointerUp}
          >
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 text-[9px] text-white/50 bg-black/40 px-1 py-0.5 rounded">
              You
            </div>
          </div>

          {/* Connecting overlay */}
          {connectionStatus !== "connected" && (
            <div className="absolute inset-0 bg-[#080C14] z-[15] flex flex-col items-center justify-center">
              {/* Particle background for cinematic feel */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <ParticleTextEffect words={["MENTRIXA", "WELCOME"]} />
              </div>

              <div className="relative z-10 flex flex-col items-center gap-10">
                {/* Mentrixa Logo with premium glow */}
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-blue-500/10 blur-2xl animate-pulse" />
                  <Image
                    src={MENTRIXA_LOGO_PNG}
                    alt="Mentrixa Logo"
                    width={100}
                    height={100}
                    className="relative z-10 w-24 h-24 object-contain"
                  />
                </div>

                <div className="text-center space-y-4">
                  <h2 className="text-white text-3xl font-bold tracking-tight">
                    Welcome to Mentrixa
                  </h2>
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-white/40 text-xs font-medium uppercase tracking-[0.3em] animate-pulse">
                      {waitingForOtherParticipant ? "Waiting for other participant" : "Establishing secure connection"}
                    </p>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-blue-500/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 rounded-full bg-blue-500/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 rounded-full bg-blue-500/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {userRole === "student" && showStudentReconnectingOverlay && connectionStatus !== "connected" && (
            <div className="absolute inset-0 z-[16] flex items-center justify-center bg-black/55">
              <div className="rounded-lg border border-sky-400/30 bg-sky-500/15 px-4 py-3 text-sm text-sky-100">
                Tutor is reconnecting. Please keep this tab open.
              </div>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div
              ref={recordingIndicatorRef}
              className={`absolute z-20 flex items-center gap-1.5 rounded px-2 py-1 bg-black/60 border border-red-500/30 transition-all duration-300 ${isSharingScreen ? "top-12 left-3" : "top-3 left-3"
                }`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-red-300">
                REC {formatTimer(recordingTime)}
              </span>
            </div>
          )}

          {/* Notifications overlay (top-right) */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end max-w-[min(100vw-3rem,22rem)]">
            {notice && (
              <div
                className={`text-xs px-3 py-2 rounded border ${notice.kind === "success"
                    ? "bg-blue-500/15 border-blue-400/30 text-blue-100"
                    : notice.kind === "info"
                      ? "bg-sky-500/15 border-sky-400/30 text-sky-100"
                      : "bg-amber-500/15 border-amber-400/30 text-amber-100"
                  }`}
              >
                <span className="leading-snug">{notice.message}</span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="ml-2 opacity-70 hover:opacity-100 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {sessionWarning && (
              <div className="text-xs px-3 py-2 rounded border bg-amber-500/15 border-amber-400/30 text-amber-100">
                <span className="leading-snug">
                  {sessionWarning === "15s"
                    ? "Session ends in 15 seconds. Please wrap up now."
                    : "Session ends in 60 seconds. Please prepare to wrap up."}
                </span>
                <button
                  type="button"
                  onClick={() => setSessionWarning(null)}
                  className="ml-2 opacity-70 hover:opacity-100 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {waitingForOtherParticipant && (
              <div className="text-xs px-3 py-2 rounded border bg-violet-500/15 border-violet-400/30 text-violet-100">
                <span className="leading-snug">
                  Waiting for the other participant to join.
                </span>
                <button
                  type="button"
                  onClick={() => setWaitingForOtherParticipant(false)}
                  className="ml-2 opacity-70 hover:opacity-100 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {userRole === "tutor" && showTutorReconnectPrompt && connectionStatus !== "connected" && (
              <div className="text-xs px-3 py-2 rounded border bg-orange-500/15 border-orange-400/30 text-orange-100">
                <span className="leading-snug">
                  Connection dropped. Rejoin now to continue the session.
                </span>
                <button
                  type="button"
                  onClick={handleTutorRejoinAttempt}
                  className="ml-2 opacity-90 hover:opacity-100 underline"
                >
                  Rejoin
                </button>
              </div>
            )}
            {error && (
              <div className="bg-red-500/15 border border-red-400/30 text-red-200 text-xs px-3 py-2 rounded">
                <span className="leading-snug">{error}</span>
                {isRequestingPermission ? " Requesting permission..." : ""}
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-2 opacity-70 hover:opacity-100 underline"
                >
                  Dismiss
                </button>
                {!isRequestingPermission && error.toLowerCase().includes("permission") && (
                  <button
                    type="button"
                    onClick={retryPermissionRequest}
                    className="ml-2 underline text-red-100"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div
            ref={controlsRef}
            className="absolute bottom-0 left-0 right-0 h-16 z-20 pb-3 bg-gradient-to-t from-[rgba(8,12,20,0.92)] to-transparent flex items-end justify-center gap-2 px-4"
          >
            {/* Mute */}
            <button
              type="button"
              onClick={toggleMute}
              disabled={isLeaving}
              className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${isMuted
                  ? "border-amber-500/40 text-amber-300"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                }`}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>

            {/* Video */}
            <button
              type="button"
              onClick={toggleVideo}
              disabled={isLeaving}
              className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${isVideoOff
                  ? "border-amber-500/40 text-amber-300"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                }`}
            >
              {isVideoOff ? "Camera on" : "Camera off"}
            </button>

            {/* Screen share — toggle off while recording keeps capture for the file (see handleStopScreenShare). */}
            <button
              type="button"
              onClick={() => {
                if (isSharingScreen) void handleStopScreenShare();
                else void handleShareScreen();
              }}
              disabled={isLeaving}
              title={
                isSharingScreen
                  ? "Stop sending your screen to the call (recording can continue)"
                  : "Share your screen"
              }
              className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${isSharingScreen
                  ? "border-sky-500/40 text-sky-300"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                }`}
            >
              {isSharingScreen ? "Stop share" : "Share"}
            </button>

            {/* Chat toggle */}
            <button
              type="button"
              onClick={() => {
                setActivePanel((p) => {
                  const next = p === "chat" ? "none" : "chat";
                  activePanelRef.current = next;
                  if (next === "chat") {
                    const msgs = latestChatMessagesRef.current;
                    const peer = msgs.filter((m) => m.authorId !== userId).length;
                    readPeerChatCountRef.current = peer;
                    setChatUnreadFromPeer(0);
                  }
                  return next;
                });
              }}
              disabled={isLeaving}
              className={`relative h-9 w-9 flex items-center justify-center rounded-md border bg-transparent active:scale-95 transition-all duration-150 ${activePanel === "chat"
                  ? "border-white/30 text-white"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white"
                }`}
              title="Chat"
              aria-label={
                chatUnreadFromPeer > 0
                  ? `Chat, ${chatUnreadFromPeer} new message${chatUnreadFromPeer === 1 ? "" : "s"}`
                  : "Chat"
              }
            >
              <MessageSquare size={14} strokeWidth={2} />
              {chatUnreadFromPeer > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-black/40">
                  {chatUnreadFromPeer > 9 ? "9+" : chatUnreadFromPeer}
                </span>
              ) : null}
            </button>

            {/* Whiteboard toggle */}
            <button
              type="button"
              onClick={() => {
                setActivePanel((p) => {
                  const next = p === "whiteboard" ? "none" : "whiteboard";
                  activePanelRef.current = next;
                  return next;
                });
              }}
              disabled={isLeaving}
              className={`h-9 w-9 flex items-center justify-center rounded-md border bg-transparent active:scale-95 transition-all duration-150 ${activePanel === "whiteboard"
                  ? "border-white/30 text-white"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white"
                }`}
              title="Whiteboard"
            >
              <LayoutPanelLeft size={14} strokeWidth={2} />
            </button>

            {sharedGridPayload ? (
              <SharedSessionGridToggle
                active={activePanel === "grid"}
                disabled={isLeaving}
                onClick={() => {
                  setActivePanel((p) => {
                    const next = p === "grid" ? "none" : "grid";
                    activePanelRef.current = next;
                    return next;
                  });
                }}
              />
            ) : null}

            {/* Record (tutor only) */}
            {userRole === "tutor" && (
              <button
                type="button"
                onClick={() => {
                  if (isRecording) void stopRecording();
                  else void startRecording();
                }}
                disabled={
                  isLeaving ||
                  connectionStatus !== "connected" ||
                  (!isRecording && isProcessingRecording)
                }
                className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${isRecording
                    ? "border-red-600/50 text-red-400 bg-red-500/10 hover:bg-red-500/15"
                    : isProcessingRecording
                      ? "border-white/10 text-white/35 cursor-wait"
                      : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                  }`}
              >
                {isProcessingRecording
                  ? "Saving…"
                  : isRecording
                    ? "Stop"
                    : "Record"}
              </button>
            )}

            {/* End call — same schedule gate for guide and learner */}
            <button
              type="button"
              onClick={() => void handleEndCall()}
              disabled={isLeaving || !manualLeaveAllowed}
              title={
                !isLeaving && !manualLeaveAllowed
                  ? "You can leave in the last 60 seconds of the scheduled session, after it ends, or if the other participant has left."
                  : undefined
              }
              className={`h-9 px-4 rounded-md text-[12px] font-medium border border-red-500/30 bg-transparent active:scale-95 transition-all duration-150 ${
                manualLeaveAllowed && !isLeaving
                  ? "text-red-300 hover:bg-red-500/10 hover:border-red-500"
                  : "text-red-300/35 border-red-500/15 cursor-not-allowed"
              }`}
            >
              {isLeaving ? "Leaving…" : "Leave"}
            </button>
          </div>
        </div>

        {/* Side panel — Chat (kept mounted so realtime messages continue while toggled) */}
        <div
          className={
            activePanel === "chat"
              ? "w-72 flex-none border-l border-white/8 overflow-hidden"
              : "hidden"
          }
        >
          <InSessionChat
            channel={realtimeChannel}
            broadcastHandlerRef={inSessionChatBroadcastRef}
            userId={userId}
            userLabel={userRole === "student" ? learnerLabel : guideLabel}
            sendDisabled={isLeaving}
            onMessagesChange={handleInSessionChatMessagesChange}
          />
        </div>

        {/* Side panel — Whiteboard */}
        {activePanel === "whiteboard" && (
          <div className="w-[480px] flex-none border-l border-white/8 overflow-hidden">
            <Whiteboard
              channel={realtimeChannel}
              userId={userId}
              onSnapshot={(url) => setWhiteboardSnapshot(url)}
              onActivitySummaryChange={(summary) => {
                whiteboardSummaryRef.current = summary;
              }}
            />
          </div>
        )}

        {sharedGridPayload ? (
          <SharedSessionGridPanel
            open={activePanel === "grid"}
            onOpenChange={(open) => {
              setActivePanel(open ? "grid" : "none");
              activePanelRef.current = open ? "grid" : "none";
            }}
            mode={userRole === "tutor" ? "guide" : "student"}
            sessionId={sessionId}
            guideName={guideLabel}
            payload={sharedGridPayload}
            channel={realtimeChannel}
            isMobile={isMobileViewport}
          />
        ) : null}
      </div>

    </div>
  );
}

