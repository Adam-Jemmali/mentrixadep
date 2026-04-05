"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { gsap } from "gsap";
import {
  createPeerConnection,
  getUserMedia,
  stopMediaStream,
} from "@/lib/webrtc";
import { leaveVideoRoom } from "@/app/actions/video";
import { saveRecording } from "@/app/actions/recordings";
import { useRouter } from "next/navigation";
import { VideoCallIllustration } from "@/components/illustrations";
import { MessageSquare, LayoutPanelLeft } from "lucide-react";
import { trackClientEvent } from "@/lib/use-track";
import {
  PreCallLobby,
  type LobbySettings,
} from "@/components/video/pre-call-lobby";
import { Whiteboard } from "@/components/video/whiteboard";
import { InSessionChat } from "@/components/video/in-session-chat";
import { PostCallSummary } from "@/components/video/post-call-summary";
import { ToolbarQualityBadge } from "@/components/video/connection-quality";

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
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Local download failed:", e);
  }
}

function humanizeRecordingError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes("network") || m.includes("failed to fetch")) {
      return "Network error while saving to the cloud. Check your connection — a copy should still be on your device.";
    }
    return err.message;
  }
  return "Something went wrong while processing the recording.";
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
    const mod = await import("@/lib/vendor/fix-webm-duration.js");
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

/** Cover-fit video into a rectangle (object-cover behavior). */
function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return;
  const scale = Math.max(w / vw, h / vh);
  const tw = vw * scale;
  const th = vh * scale;
  const tx = x + (w - tw) / 2;
  const ty = y + (h - th) / 2;
  ctx.drawImage(video, tx, ty, tw, th);
}

/** Letterboxed fit — entire frame visible (object-contain), for screen / full-frame fidelity. */
function drawVideoContain(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return;
  const scale = Math.min(w / vw, h / vh);
  const tw = vw * scale;
  const th = vh * scale;
  const tx = x + (w - tw) / 2;
  const ty = y + (h - th) / 2;
  ctx.drawImage(video, tx, ty, tw, th);
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
}: VideoCallProps) {
  const router = useRouter();
  const afterCallPath = userRole === "tutor" ? "/tutor" : "/student";

  // ─── Lobby / phase state ───────────────────────────────────────────────────
  const [inLobby, setInLobby] = useState(true);
  const [lobbySettings, setLobbySettings] = useState<LobbySettings | null>(null);

  // ─── Panel state (chat / whiteboard) ─────────────────────────────────────
  const [activePanel, setActivePanel] = useState<"none" | "chat" | "whiteboard">("none");

  // ─── Post-call summary ────────────────────────────────────────────────────
  const [showPostCall, setShowPostCall] = useState(false);
  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

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
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  /** Student (and non-sharing): main video uses contain for remote display-capture so nothing is cropped. */
  const [remoteMainVideoFit, setRemoteMainVideoFit] = useState<"cover" | "contain">("cover");
  const [isPipDragging, setIsPipDragging] = useState(false);
  const [pipPosition, setPipPosition] = useState<{ left: number; top: number } | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error" | "info";
    message: string;
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
  /** After Supabase channel.track — safe to interpret presence as "in room". */
  const realtimeRoomJoinedRef = useRef(false);
  const lastRealtimeStatusRef = useRef<string | null>(null);

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
      void ctx.close().catch(() => {});
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
            void remoteVideoRef.current.play().catch(() => {});
          }
          if (localVideoRef.current && remoteStreamRef.current) {
            localVideoRef.current.srcObject = remoteStreamRef.current;
            void localVideoRef.current.play().catch(() => {});
          }
          return;
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          void remoteVideoRef.current.play().catch(() => {});
        }
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          void localVideoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.warn("rebindVideoElementsAfterRecording:", e);
      }
    });
  }

  const handleEndCall = async () => {
    if (isLeaving) return;
    isLeavingRef.current = true;
    setIsLeaving(true);
    setWaitingForOtherParticipant(false);

    try {
      const mr = mediaRecorderRef.current;
      if (
        mr &&
        (mr.state === "recording" || mr.state === "paused")
      ) {
        await stopRecording();
      }

      // Stop media streams
      stopMediaStream(localStreamRef.current);

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      // Leave room
      await leaveVideoRoom(sessionId);

      // Untrack presence and unsubscribe from channel
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
        channelRef.current.unsubscribe();
      }

      // Show post-call summary instead of immediately navigating
      setShowPostCall(true);
    } catch (err) {
      console.error("Error ending call:", err);
      router.push(afterCallPath);
    }
  };

  // Initialize Supabase client for Realtime
  useEffect(() => {
    supabaseRef.current = createClient(env.public.supabaseUrl, env.public.supabaseAnonKey);
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    document.body.style.background = "#000";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.background = "";
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    isSharingScreenRef.current = isSharingScreen;
  }, [isSharingScreen]);

  useEffect(() => {
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

  useEffect(() => {
    if (isRecording && recordingIndicatorRef.current) {
      gsap.fromTo(
        recordingIndicatorRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.5, transformOrigin: "left" },
      );
    }
  }, [isRecording]);

  useEffect(() => {
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
    if (remoteStreamRef.current && remoteVideoRef.current && document.contains(remoteVideoRef.current)) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch((err) => {
          if (!err.message?.includes("play() request was interrupted")) {
            console.error("Error playing remote video (useEffect):", err);
          }
        });
      }
    }
  }, [connectionStatus, hasRemoteStream, isSharingScreen]);

  const syncRemoteMainVideoFit = useCallback(() => {
    if (isSharingScreen) return;
    const stream = remoteVideoRef.current?.srcObject as MediaStream | null;
    const t = stream?.getVideoTracks()[0];
    setRemoteMainVideoFit(isDisplayCaptureVideoTrack(t) ? "contain" : "cover");
  }, [isSharingScreen]);

  // Auto-disconnect when session ends
  useEffect(() => {
    const checkSessionEnd = setInterval(async () => {
      try {
        const { validateJoinRequest } = await import("@/app/actions/video");
        await validateJoinRequest(sessionId);
      } catch (error) {
        // Session window expired, disconnect
        if (error instanceof Error && error.message.includes("expired")) {
          handleEndCall();
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkSessionEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Initialize WebRTC and signaling
  useEffect(() => {
    let mounted = true;

        async function initializeCall() {
      try {
        callWasConnectedRef.current = false;
        peerLeftNoticeShownRef.current = false;
        realtimeRoomJoinedRef.current = false;
        if (mounted) setWaitingForOtherParticipant(false);

        console.log("Initializing call...");
        setConnectionStatus("connecting");
        
        // Get user media — prefer devices chosen in pre-call lobby
        console.log("Requesting camera and microphone access...");
        let stream: MediaStream;
        const lbs = lobbySettings;
        if (lbs?.audioDeviceId || lbs?.videoDeviceId) {
          const constraints: MediaStreamConstraints = {
            audio: lbs.audioEnabled !== false
              ? { deviceId: lbs.audioDeviceId ? { exact: lbs.audioDeviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              : false,
            video: lbs.videoEnabled !== false
              ? { deviceId: lbs.videoDeviceId ? { exact: lbs.videoDeviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
              : false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints).catch(() => getUserMedia(true, true));
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
          localVideoRef.current.play().catch(() => {});
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
          
          if (!localVideoRef.current) {
            console.error("Video element not found after waiting");
            setError("Video element not ready. Please refresh the page.");
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
              
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                void el.play().catch(() => {});
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

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          if (!mounted) return;
          const state = pc.connectionState;
          console.log("Peer connection state changed:", state);

          if (state === "connected") {
            callWasConnectedRef.current = true;
            setWaitingForOtherParticipant(false);
            setConnectionStatus("connected");
            setHasRemoteStream(true);
            console.log("Peer connection established!");
            console.log("Local tracks:", stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
            if (remoteStreamRef.current) {
              console.log("Remote tracks:", remoteStreamRef.current.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
            }
          } else if (state === "failed" || state === "disconnected" || state === "closed") {
            if (callWasConnectedRef.current && !isLeavingRef.current) {
              console.log("Peer left the call — staying in room with local video");
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
            } else if (!callWasConnectedRef.current) {
              // Never connected — only show error for initial connection failure
              if (state === "failed") {
                setConnectionStatus("disconnected");
                setError("Connection failed. Please try refreshing the page.");
              } else if (state === "disconnected") {
                setTimeout(() => {
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
        if (!supabaseRef.current) return;

        const channel = supabaseRef.current.channel(`video-room-${roomId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: userId },
          },
        });

        channelRef.current = channel;

        // Handle incoming offers
        channel.on("broadcast", { event: "offer" }, async (message) => {
          // Extract payload - Supabase Realtime wraps it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        channel.on("broadcast", { event: "answer" }, async (message) => {
          // Extract payload - Supabase Realtime wraps it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        channel.on("broadcast", { event: "ice-candidate" }, async (message) => {
          // Extract payload - Supabase Realtime wraps it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // Track presence to know when both participants are ready
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
          }
        });

        channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log("Participant joined:", key, newPresences);
          if (key !== userId) {
            if (mounted) setWaitingForOtherParticipant(false);
            otherParticipantPresent = true;
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

        channel.on("presence", { event: "leave" }, ({ key }) => {
          if (!mounted || key === userId || isLeavingRef.current) return;
          if (!callWasConnectedRef.current) return;
          if (peerLeftNoticeShownRef.current) return;
          peerLeftNoticeShownRef.current = true;
          console.log("Presence: other participant left the room");
          setNotice({
            kind: "info",
            message: "The other participant has left the call.",
          });
          setHasRemoteStream(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });

        // Subscribe to channel and set presence
        await channel.subscribe(async (status) => {
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
          console.error("Error initializing call:", err);
          if (err instanceof Error) {
            const errorMsg = err.message;
            console.error("Full error details:", {
              name: err.name,
              message: errorMsg,
              stack: err.stack
            });
            setError(errorMsg);
            
            // If it's a permission error, set a flag to show retry button
            if (errorMsg.toLowerCase().includes("permission") || 
                errorMsg.toLowerCase().includes("denied") ||
                err.name === "NotAllowedError" ||
                err.name === "PermissionDeniedError") {
              setIsRequestingPermission(true);
            }
          } else {
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
        console.log("Creating offer...");
        
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally initialize call once for identity/session tuple
  }, [sessionId, roomId, roomToken, userRole, userId]);

  const toggleMute = () => {
    runControlAction(() => {
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        audioTracks.forEach((track) => {
          track.enabled = isMuted;
        });
        setIsMuted(!isMuted);
      }
    });
  };

  const toggleVideo = () => {
    runControlAction(() => {
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.enabled = isVideoOff;
        });
        setIsVideoOff(!isVideoOff);
      }
    });
  };

  const startRecording = async () => {
    if (isStartingRecordingRef.current || isRecording || isProcessingRecording) {
      return;
    }
    if (!localStreamRef.current) {
      setError("Cannot start recording: local stream not available");
      return;
    }

    if (connectionStatus !== "connected") {
      setError("Cannot start recording: wait until the call is connected.");
      return;
    }

    if (!localVideoRef.current) {
      setError("Video is not ready yet. Wait a moment, then try Record again.");
      return;
    }

    if (!displayVideoTrackRef.current && !remoteVideoRef.current) {
      setError("Connect with the other participant first, or share your screen to record.");
      return;
    }

    const consentOk = window.confirm(
      "Recording consent required: confirm that both parties explicitly agree to this recording."
    );
    if (!consentOk) {
      setError(
        "Recording not started. You must confirm both parties agreed to recording."
      );
      return;
    }

    isStartingRecordingRef.current = true;
    try {
      console.log("Starting recording...");
      setError(null);
      setNotice(null);

      const localVideo = localVideoRef.current;
      const remoteVideo = remoteVideoRef.current;

      if (localVideo.paused) {
        await localVideo.play().catch((err) => console.warn("Local video play error:", err));
      }
      if (remoteVideo && remoteVideo.paused) {
        await remoteVideo.play().catch((err) => console.warn("Remote video play error:", err));
      }

      closeRecordingAudioContext();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        await audioContext.resume().catch(() => {});
      }

      // Always composite with canvas so the file includes both participants + screen share layout
      // (direct capture of a single display track omitted remote PiP and was not a full session record).
      let combinedStream: MediaStream;

      {
        let cw = 1920;
        let ch = 1080;
        if (isSharingScreenRef.current) {
          const rv = remoteVideo;
          if (rv && rv.videoWidth > 0 && rv.videoHeight > 0) {
            cw = rv.videoWidth;
            ch = rv.videoHeight;
          } else if (displayVideoTrackRef.current) {
            const s = displayVideoTrackRef.current.getSettings();
            if (s.width && s.height) {
              cw = s.width;
              ch = s.height;
            }
          }
          const maxDim = 3840;
          if (cw > maxDim || ch > maxDim) {
            const scale = Math.min(maxDim / cw, maxDim / ch);
            cw = Math.floor(cw * scale);
            ch = Math.floor(ch * scale);
          }
          cw = Math.max(640, cw);
          ch = Math.max(360, ch);
        }
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          setError("Failed to create canvas context");
          return;
        }

        canvasRef.current = canvas;
        recordingActiveRef.current = true;

        const drawFrame = () => {
          if (!ctx || !recordingActiveRef.current) {
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            return;
          }

          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const sharing = isSharingScreenRef.current;

          if (sharing) {
            // Layout matches UI: main (remoteVideoRef) = screen capture; PiP (localVideoRef) = other person
            const screenEl = remoteVideo;
            const pipEl = localVideo;
            if (screenEl && screenEl.readyState >= 2 && screenEl.videoWidth > 0) {
              try {
                drawVideoContain(ctx, screenEl, 0, 0, canvas.width, canvas.height);
              } catch (err) {
                console.warn("Error drawing screen share:", err);
              }
            }
            if (pipEl && pipEl.readyState >= 2 && pipEl.videoWidth > 0) {
              try {
                const pw = canvas.width * 0.22;
                const ph = canvas.height * 0.22;
                const px = canvas.width - pw - 16;
                const py = 16;
                drawVideoCover(ctx, pipEl, px, py, pw, ph);
              } catch (err) {
                console.warn("Error drawing PiP:", err);
              }
            }
          } else {
            // Default: remote main, local PiP
            if (remoteVideo && remoteVideo.readyState >= 2 && remoteVideo.videoWidth > 0) {
              try {
                drawVideoCover(ctx, remoteVideo, 0, 0, canvas.width * 0.72, canvas.height);
              } catch (err) {
                console.warn("Error drawing remote video:", err);
              }
            }
            if (localVideo.readyState >= 2 && localVideo.videoWidth > 0) {
              try {
                const pw = canvas.width * 0.26;
                const ph = canvas.height * 0.26;
                const px = canvas.width - pw - 20;
                const py = canvas.height - ph - 20;
                drawVideoCover(ctx, localVideo, px, py, pw, ph);
              } catch (err) {
                console.warn("Error drawing local video:", err);
              }
            }
          }

          if (recordingActiveRef.current) {
            animationFrameRef.current = requestAnimationFrame(drawFrame);
          }
        };

        drawFrame();

        const canvasStream = canvas.captureStream(30);
        canvasStreamRef.current = canvasStream;

        combinedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

        if (destination && destination.stream.getAudioTracks().length > 0) {
          destination.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
        } else if (localStreamRef.current.getAudioTracks().length > 0) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            combinedStream.addTrack(track.clone());
          });
        }

        combinedStreamForRecordingRef.current = combinedStream;
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      console.log("Combined stream tracks:", {
        video: combinedStream.getVideoTracks().length,
        audio: combinedStream.getAudioTracks().length,
        screenShareLayout: isSharingScreenRef.current,
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
      const treatAsHighMotion =
        isSharingScreenRef.current || (videoTrackForBitrate?.getSettings().width ?? 0) > 1600;
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

          const result = await saveRecording(uploadFormData);

          if (!result.success) {
            setError(null);
            setNotice({
              kind: "error",
              message: `Saved “${fileName}” to your device (Downloads). Cloud backup failed: ${result.error ?? "Unknown error"}.`,
            });
            return;
          }

          setError(null);
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
          rebindVideoElementsAfterRecording();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        isStoppingRef.current = false;
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
      recordingWallClockStartMsRef.current = Date.now();
      mediaRecorder.start(250);

      await new Promise((resolve) => setTimeout(resolve, 150));

      if (mediaRecorder.state !== "recording") {
        console.error("MediaRecorder failed to start, state:", mediaRecorder.state);
        setError("Failed to start recording. Please try again.");
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
    } finally {
      isStartingRecordingRef.current = false;
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
      const ctx = recordingAudioContextRef.current;
      recordingAudioContextRef.current = null;
      if (ctx && ctx.state !== "closed") {
        void ctx.close().catch(() => {});
      }
    };
  }, []);

  const retryPermissionRequest = async () => {
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
      console.error("Error retrying permission:", err);
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

  const handleShareScreen = async () => {
    if (controlActionLockRef.current || isSharingScreen || !peerConnectionRef.current) return;
    controlActionLockRef.current = true;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 30 },
          // Show pointer in capture when the browser supports it
          cursor: "always",
        } as MediaTrackConstraints,
        audio: false,
      });
      const displayTrack = displayStream.getVideoTracks()[0];
      if (!displayTrack) {
        setNotice({
          kind: "error",
          message: "Screen share started but no video track was returned.",
        });
        return;
      }

      const pc = peerConnectionRef.current;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");

      const existingCamera = localStreamRef.current
        ?.getVideoTracks()
        .find((t) => t.kind === "video" && t.readyState === "live");
      cameraTrackBeforeScreenRef.current = existingCamera ?? null;

      if (sender) {
        try {
          await sender.replaceTrack(displayTrack);
        } catch (replaceErr) {
          console.error("replaceTrack (screen) failed:", replaceErr);
          displayTrack.stop();
          cameraTrackBeforeScreenRef.current = null;
          setError(
            replaceErr instanceof Error
              ? replaceErr.message
              : "Could not attach screen share to the call.",
          );
          return;
        }
      } else {
        console.warn("No video sender; screen preview only");
      }

      displayVideoTrackRef.current = displayTrack;

      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const preview = new MediaStream([displayTrack, ...audioTracks]);

      // Fullscreen main = your screen (1:1 with capture, letterboxed). PiP = other participant.
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = preview;
        await remoteVideoRef.current.play().catch((e) => {
          console.warn("Screen preview on main video:", e);
        });
      }
      if (localVideoRef.current && remoteStreamRef.current) {
        localVideoRef.current.srcObject = remoteStreamRef.current;
        await localVideoRef.current.play().catch((e) => {
          console.warn("Remote participant in PiP:", e);
        });
      }

      setIsSharingScreen(true);

      displayTrack.onended = async () => {
        displayVideoTrackRef.current = null;
        isSharingScreenRef.current = false;

        const pcNow = peerConnectionRef.current;
        const videoSender = pcNow
          ?.getSenders()
          .find((s) => s.track?.kind === "video");

        const cameraTrack =
          cameraTrackBeforeScreenRef.current ??
          localStreamRef.current
            ?.getVideoTracks()
            .find((t) => t.kind === "video" && t.readyState === "live");

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
          console.warn("replaceTrack (camera after screen end) failed:", e);
          setNotice({
            kind: "error",
            message:
              "Screen share ended. If your camera is missing, turn video off and on or refresh the page.",
          });
        }

        cameraTrackBeforeScreenRef.current = null;

        try {
          if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            await remoteVideoRef.current.play().catch(() => {});
          }
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            await localVideoRef.current.play().catch(() => {});
          }
        } catch (e) {
          console.warn("Restoring camera layout failed:", e);
        }

        setIsSharingScreen(false);
      };
    } catch (err) {
      console.warn("getDisplayMedia:", err);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Screen sharing was blocked or cancelled."
          : "Screen sharing was cancelled or unavailable.",
      );
    } finally {
      window.setTimeout(() => {
        controlActionLockRef.current = false;
      }, 200);
    }
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
        onJoin={(settings) => {
          setLobbySettings(settings);
          setInLobby(false);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 touch-manipulation bg-[#080C14] overflow-hidden text-white flex flex-col">
      {/* Top bar */}
      <div className="flex-none h-12 z-10 px-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-[rgba(8,12,20,0.8)]">
        <p className="text-sm font-medium text-white/40">Mentrixa</p>
        <p className="text-xs text-white/30 hidden sm:block">
          {courseLabel} · {learnerLabel} &amp; {guideLabel}
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
            className={`w-full h-full ${
              isSharingScreen || remoteMainVideoFit === "contain"
                ? "object-contain"
                : "object-cover"
            }`}
          />

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
            <div className="absolute inset-0 bg-black/80 z-[15] flex items-center justify-center">
              <VideoCallIllustration />
              <div className="text-center absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-white text-sm font-mono">Connecting...</p>
                <div className="w-[200px] border-b border-[#2563EB] mt-3" ref={connectingLineRef} />
              </div>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div
              ref={recordingIndicatorRef}
              className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded px-2 py-1 bg-black/60 border border-red-500/30"
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
                className={`text-xs px-3 py-2 rounded border ${
                  notice.kind === "success"
                    ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-100"
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
              onClick={toggleMute}
              disabled={isLeaving}
              className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${
                isMuted
                  ? "border-amber-500/40 text-amber-300"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>

            {/* Video */}
            <button
              onClick={toggleVideo}
              disabled={isLeaving}
              className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${
                isVideoOff
                  ? "border-amber-500/40 text-amber-300"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              {isVideoOff ? "Camera on" : "Camera off"}
            </button>

            {/* Screen share */}
            <button
              onClick={() => void handleShareScreen()}
              disabled={isLeaving || isSharingScreen}
              className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${
                isSharingScreen
                  ? "border-sky-500/40 text-sky-300"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              {isSharingScreen ? "Sharing" : "Share"}
            </button>

            {/* Chat toggle */}
            <button
              onClick={() =>
                setActivePanel((p) => (p === "chat" ? "none" : "chat"))
              }
              disabled={isLeaving}
              className={`h-9 w-9 flex items-center justify-center rounded-md border bg-transparent active:scale-95 transition-all duration-150 ${
                activePanel === "chat"
                  ? "border-white/30 text-white"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white"
              }`}
              title="Chat"
            >
              <MessageSquare size={14} strokeWidth={2} />
            </button>

            {/* Whiteboard toggle */}
            <button
              onClick={() =>
                setActivePanel((p) => (p === "whiteboard" ? "none" : "whiteboard"))
              }
              disabled={isLeaving}
              className={`h-9 w-9 flex items-center justify-center rounded-md border bg-transparent active:scale-95 transition-all duration-150 ${
                activePanel === "whiteboard"
                  ? "border-white/30 text-white"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white"
              }`}
              title="Whiteboard"
            >
              <LayoutPanelLeft size={14} strokeWidth={2} />
            </button>

            {/* Record (tutor only) */}
            {userRole === "tutor" && (
              <button
                onClick={() => {
                  if (isRecording) stopRecording();
                  else void startRecording();
                }}
                disabled={isLeaving || connectionStatus !== "connected" || isProcessingRecording}
                className={`h-9 px-3 rounded-md text-[12px] font-medium border bg-transparent active:scale-95 transition-all duration-150 ${
                  isRecording
                    ? "border-red-600/50 text-red-300 hover:border-red-400"
                    : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                {isRecording ? "Stop rec" : "Record"}
              </button>
            )}

            {/* End call */}
            <button
              onClick={() => void handleEndCall()}
              disabled={isLeaving}
              className="h-9 px-4 rounded-md text-[12px] font-medium border border-red-500/30 text-red-300 bg-transparent hover:bg-red-500/10 hover:border-red-500 active:scale-95 transition-all duration-150"
            >
              {isLeaving ? "Leaving…" : "Leave"}
            </button>
          </div>
        </div>

        {/* Side panel — Chat */}
        {activePanel === "chat" && (
          <div className="w-72 flex-none border-l border-white/8 overflow-hidden">
            <InSessionChat
              channel={channelRef.current}
              userId={userId}
              userLabel={userRole === "student" ? learnerLabel : guideLabel}
            />
          </div>
        )}

        {/* Side panel — Whiteboard */}
        {activePanel === "whiteboard" && (
          <div className="w-[480px] flex-none border-l border-white/8 overflow-hidden">
            <Whiteboard
              channel={channelRef.current}
              userId={userId}
              onSnapshot={(url) => setWhiteboardSnapshot(url)}
            />
          </div>
        )}
      </div>

      {/* Post-call summary overlay */}
      {showPostCall && (
        <PostCallSummary
          sessionId={sessionId}
          userRole={userRole}
          durationSeconds={sessionSeconds}
          recordingSaved={isProcessingRecording || false}
          whiteboardSnapshotUrl={whiteboardSnapshot}
          onClose={() => setShowPostCall(false)}
        />
      )}
    </div>
  );
}

