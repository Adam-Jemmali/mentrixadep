/**
 * WebRTC utilities for video calling
 */

export interface WebRTCConfig {
  stunServers: RTCIceServer[];
  turnServers: RTCIceServer[];
}

/**
 * Get WebRTC configuration from environment
 */
export function getWebRTCConfig(): RTCConfiguration {
  const stunServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  // Add custom STUN servers from env if provided
  const customStun = process.env.NEXT_PUBLIC_STUN_SERVERS;
  if (customStun) {
    customStun.split(",").forEach((url) => {
      stunServers.push({ urls: url.trim() });
    });
  }

  // Add TURN servers from env if provided
  const turnServers: RTCIceServer[] = [];
  const customTurn = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (customTurn) {
    customTurn.split(",").forEach((url) => {
      const parts = url.trim().split("|");
      const server = parts[0];
      const username = parts[1];
      const credential = parts[2];
      if (!server) return;
      if (username && credential) {
        turnServers.push({
          urls: server,
          username,
          credential,
        });
      } else {
        turnServers.push({ urls: server });
      }
    });
  }

  return {
    iceServers: [...stunServers, ...turnServers],
    iceCandidatePoolSize: 10, // Pre-gather ICE candidates for faster connection
    iceTransportPolicy: "all", // Use both relay and direct connections
    bundlePolicy: "max-bundle", // Bundle RTP and RTCP for efficiency
    rtcpMuxPolicy: "require", // Require RTCP multiplexing
  };
}

/**
 * Create a new RTCPeerConnection
 */
export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection(getWebRTCConfig());
}

/**
 * Check if media devices are available
 */
export function checkMediaDevicesSupport(): {
  supported: boolean;
  error?: string;
} {
  if (typeof navigator === "undefined") {
    return { supported: false, error: "Navigator not available" };
  }

  if (!navigator.mediaDevices) {
    return {
      supported: false,
      error: "MediaDevices API not available. Please use HTTPS or localhost.",
    };
  }

  if (!navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      error: "getUserMedia not available. Please use a modern browser.",
    };
  }

  return { supported: true };
}

/** User dismissed or blocked camera/microphone (or screen capture) in the browser prompt. */
export function isMediaPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    name === "AbortError"
  );
}

/**
 * Turn getUserMedia / getDisplayMedia failures into a single Error suitable for UI and logging.
 */
export function mapMediaStreamError(err: unknown): Error {
  if (!(err instanceof Error)) {
    return new Error("Could not access camera or microphone.");
  }
  const errorName = err.name;

  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      return new Error(
        "Camera/microphone permission denied. In Safari, allow Camera and Microphone for this site in settings, or enable Develop → Allow Media Capture on Insecure Sites on localhost.",
      );
    }
    return new Error(
      "Camera/microphone permission denied. Click the lock or site icon in the address bar, set Camera and Microphone to Allow, then try again.",
    );
  }

  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return new Error("No camera or microphone found. Please connect a device and try again.");
  }

  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return new Error(
      "Camera or microphone is being used by another application. Close other apps using it and try again.",
    );
  }

  if (errorName === "AbortError") {
    return new Error("The media request was cancelled.");
  }

  return new Error(`Could not access camera or microphone: ${err.message}`);
}

/**
 * Check current permissions for camera and microphone
 */
export async function checkPermissions(): Promise<{
  camera: PermissionState;
  microphone: PermissionState;
}> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const [cameraResult, microphoneResult] = await Promise.all([
        navigator.permissions.query({ name: "camera" as PermissionName }).catch(() => null),
        navigator.permissions.query({ name: "microphone" as PermissionName }).catch(() => null),
      ]);

      return {
        camera: cameraResult?.state || "prompt",
        microphone: microphoneResult?.state || "prompt",
      };
    }
  } catch (err) {
    console.warn("Permission query not supported:", err);
  }

  return { camera: "prompt", microphone: "prompt" };
}

/**
 * Get user media (camera and microphone)
 * Based on WebRTC best practices and MDN documentation
 */
export async function getUserMedia(
  audio: boolean = true,
  video: boolean = true
): Promise<MediaStream> {
  // Check if media devices are supported
  const supportCheck = checkMediaDevicesSupport();
  if (!supportCheck.supported) {
    throw new Error(supportCheck.error || "Media devices not supported");
  }

  // Verify secure context (HTTPS or localhost)
  const isSecureContext = 
    window.isSecureContext || 
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  if (!isSecureContext) {
    throw new Error(
      "Camera/microphone access requires a secure context (HTTPS or localhost). " +
      "Please access the site via https:// or http://localhost"
    );
  }

  // Check current permissions (non-blocking, just for info)
  try {
    const permissions = await checkPermissions();
    if (video && permissions.camera === "denied") {
      console.warn("Camera permission is denied in browser settings");
    }
    if (audio && permissions.microphone === "denied") {
      console.warn("Microphone permission is denied in browser settings");
    }
  } catch (err) {
    // Permission query not supported in all browsers, continue anyway
    console.warn("Could not check permissions:", err);
  }

  // Build constraints - start with ideal values, fallback to basic if needed
  const buildConstraints = (): MediaStreamConstraints => {
    return {
      audio: audio
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : false,
      video: video
        ? {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: "user",
          }
        : false,
    };
  };

  try {
    // First attempt with ideal constraints
    const constraints = buildConstraints();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Verify we actually got the tracks we requested
    if (video && stream.getVideoTracks().length === 0) {
      throw new Error("No video track available in stream");
    }
    if (audio && stream.getAudioTracks().length === 0) {
      throw new Error("No audio track available in stream");
    }

    // Verify tracks are actually enabled
    if (video) {
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack || !videoTrack.enabled) {
        console.warn("Video track exists but is not enabled");
      }
    }
    if (audio) {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        console.warn("Audio track exists but is not enabled");
      }
    }

    return stream;
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      const errorName = error.name;

      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        throw mapMediaStreamError(error);
      }

      if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        throw mapMediaStreamError(error);
      }

      if (errorName === "NotReadableError" || errorName === "TrackStartError") {
        throw mapMediaStreamError(error);
      }

      if (errorName === "AbortError") {
        throw mapMediaStreamError(error);
      }

      if (errorName === "OverconstrainedError") {
        // Fallback to basic constraints
        console.warn("Ideal constraints failed, trying basic constraints");
        try {
          const fallbackConstraints: MediaStreamConstraints = {
            audio: audio ? true : false,
            video: video ? true : false,
          };
          const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          
          // Verify we got what we need
          if (video && fallbackStream.getVideoTracks().length === 0) {
            throw new Error("No video track available even with basic constraints");
          }
          if (audio && fallbackStream.getAudioTracks().length === 0) {
            throw new Error("No audio track available even with basic constraints");
          }
          
          return fallbackStream;
        } catch (fallbackError) {
          if (isMediaPermissionDenied(fallbackError)) {
            throw mapMediaStreamError(fallbackError);
          }
          throw new Error(
            `Could not access camera/microphone: ${error.message}. ` +
              "Please check your device connections and browser permissions.",
          );
        }
      }

      throw mapMediaStreamError(error);
    }

    throw new Error("Failed to access camera/microphone. Please check your browser settings and device connections.");
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

