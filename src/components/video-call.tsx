"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import {
  createPeerConnection,
  getUserMedia,
  stopMediaStream,
} from "@/lib/webrtc";
import { leaveVideoRoom } from "@/app/actions/video";
import { useRouter } from "next/navigation";

interface VideoCallProps {
  sessionId: string;
  roomId: string;
  roomToken: string;
  userRole: "student" | "tutor";
  userId: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function VideoCall({
  sessionId,
  roomId,
  roomToken,
  userRole,
  userId,
}: VideoCallProps) {
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof createClient>["channel"] | null>(
    null
  );
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleEndCall = async () => {
    if (isLeaving) return;
    setIsLeaving(true);

    try {
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
        try {
          await channelRef.current.untrack();
        } catch (err) {
          console.warn("Error untracking presence:", err);
        }
        channelRef.current.unsubscribe();
      }

      // Navigate away
      router.push("/dashboard");
    } catch (err) {
      console.error("Error ending call:", err);
      router.push("/dashboard");
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

  // Ensure local video stream is displayed when available
  // This effect handles re-attaching the stream when the component updates
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current && document.contains(localVideoRef.current)) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        // Only play if video is enabled
        if (!isVideoOff) {
          localVideoRef.current.play().catch((err) => {
            // Ignore autoplay policy errors - video will play on user interaction
            if (!err.message.includes("play() request was interrupted")) {
              console.error("Error playing local video (useEffect):", err);
            }
          });
        }
      }
    }
  }, [isMuted, isVideoOff]); // Re-attach when controls change

  // Store remote stream in a ref to ensure it persists
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Effect to ensure remote video plays when stream is available
  useEffect(() => {
    if (remoteStreamRef.current && remoteVideoRef.current && document.contains(remoteVideoRef.current)) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        console.log("Re-attaching remote stream to video element");
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch((err) => {
          console.error("Error playing remote video (useEffect):", err);
        });
      }
    }
  }, [connectionStatus]);

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
        // Get user media (includes secure context check)
        const stream = await getUserMedia(true, true);
        if (!mounted) {
          stopMediaStream(stream);
          return;
        }

        console.log("Got media stream:", stream);
        console.log("Video tracks:", stream.getVideoTracks());
        console.log("Audio tracks:", stream.getAudioTracks());

        localStreamRef.current = stream;
        
        // Ensure video element is ready before setting stream
        // According to WebRTC best practices, we should set srcObject and then play
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
              
              const onError = (e: Event) => {
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

        // Create peer connection
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;

        // Add local stream tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Handle remote stream
        pc.ontrack = (event) => {
          console.log("Received remote track:", event.track.kind, event.streams.length);
          
          if (!mounted) return;
          
          // Get the remote stream
          let remoteStream = event.streams[0];
          
          // If no stream in event, create one or use existing
          if (!remoteStream) {
            if (remoteStreamRef.current) {
              // Add track to existing stream
              remoteStreamRef.current.addTrack(event.track);
              remoteStream = remoteStreamRef.current;
            } else {
              // Create new stream
              remoteStream = new MediaStream([event.track]);
              remoteStreamRef.current = remoteStream;
            }
          } else {
            // Store the stream reference
            remoteStreamRef.current = remoteStream;
          }
          
          console.log("Remote stream tracks:", remoteStream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled })));
          
          // Set remote stream on video element
          const setRemoteVideo = async () => {
            if (!remoteVideoRef.current) {
              console.warn("Remote video element not ready, retrying...");
              setTimeout(setRemoteVideo, 100);
              return;
            }

            try {
              console.log("Setting remote video stream...");
              remoteVideoRef.current.srcObject = remoteStream;
              
              // Wait for metadata to load
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
                
                const onError = (e: Event) => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.removeEventListener("error", onError);
                    reject(new Error("Video element error"));
                  }
                };
                
                remoteVideoRef.current.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
                remoteVideoRef.current.addEventListener("error", onError, { once: true });
                
                // If already loaded, resolve immediately
                if (remoteVideoRef.current.readyState >= 1) {
                  resolve();
                }
              });
              
              // Play the video
              await remoteVideoRef.current.play();
              console.log("Remote video playing successfully");
              
              setConnectionStatus("connected");
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
            setConnectionStatus("connected");
            console.log("Peer connection established!");
          } else if (state === "disconnected" || state === "failed") {
            setConnectionStatus("disconnected");
            console.warn("Peer connection lost:", state);
          } else if (state === "connecting" || state === "checking") {
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

            const answer = await pc.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            
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

        // Handle incoming answers
        channel.on("broadcast", { event: "answer" }, async (message) => {
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

            console.log("Received answer, setting remote description...");
            await pc.setRemoteDescription(
              new RTCSessionDescription(answerData)
            );
            console.log("Answer processed successfully");
          } catch (err) {
            console.error("Error handling answer:", err);
            if (err instanceof Error) {
              setError(`Failed to handle call answer: ${err.message}`);
            } else {
              setError("Failed to handle call answer");
            }
          }
        });

        // Handle ICE candidates
        channel.on("broadcast", { event: "ice-candidate" }, async (message) => {
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

        // Track presence to know when both participants are ready
        let offerSent = false;
        let answerReceived = false;
        let otherParticipantPresent = false;

        // Track presence of other participant
        channel.on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const participants = Object.keys(state);
          const hasOtherParticipant = participants.some(
            (key) => key !== userId
          );
          
          console.log("Presence sync:", { participants, hasOtherParticipant, userId });
          
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

        // Subscribe to channel and set presence
        await channel.subscribe(async (status) => {
          console.log("Channel subscription status:", status);
          if (status === "SUBSCRIBED") {
            // Set presence to indicate we're in the room
            await channel.track({
              userId,
              role: userRole,
              joinedAt: new Date().toISOString(),
            });

            // Wait a bit for other participant, then create offer if student
            if (userRole === "student") {
              // Check if other participant is already present
              const state = channel.presenceState();
              const participants = Object.keys(state);
              const hasOtherParticipant = participants.some(
                (key) => key !== userId
              );

              if (hasOtherParticipant) {
                // Other participant already here, send offer immediately
                setTimeout(() => {
                  if (!offerSent && mounted) {
                    createOffer(pc, channel);
                    offerSent = true;
                  }
                }, 300);
              } else {
                // Wait for other participant, but also send offer after timeout as fallback
                setTimeout(() => {
                  if (!offerSent && mounted) {
                    console.log("Sending offer after timeout (other participant may join later)");
                    createOffer(pc, channel);
                    offerSent = true;
                  }
                }, 2000); // 2 second timeout
              }
            }
          }
        });
      } catch (err) {
        if (mounted) {
          console.error("Error initializing call:", err);
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to initialize video call");
          }
          setConnectionStatus("error");
        }
      }
    }

    async function createOffer(
      pc: RTCPeerConnection,
      channel: ReturnType<typeof createClient>["channel"]
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

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        
        console.log("Offer created:", offer.type, offer.sdp?.substring(0, 100));
        
        await pc.setLocalDescription(offer);

        console.log("Sending offer via channel...");
        channel.send({
          type: "broadcast",
          event: "offer",
          payload: {
            offer: {
              type: offer.type,
              sdp: offer.sdp,
            },
            from: userId,
          },
        });
        
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
  }, [sessionId, roomId, roomToken, userRole, userId]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

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

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div>
          <h1 className="text-lg font-semibold">Video Call</h1>
          <p className="text-sm text-gray-400">
            {connectionStatus === "connecting" && "Connecting..."}
            {connectionStatus === "connected" && "Connected"}
            {connectionStatus === "disconnected" && "Disconnected"}
            {connectionStatus === "error" && "Connection Error"}
          </p>
        </div>
        <div className="text-sm text-gray-400">Role: {userRole}</div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-600 text-white p-4">
          <div className="max-w-4xl mx-auto">
            <p className="font-semibold mb-2">{error}</p>
            {error.includes("permission") && (
              <div className="text-sm text-red-100 mt-3 space-y-3">
                <div>
                  <button
                    onClick={retryPermissionRequest}
                    disabled={isRequestingPermission}
                    className="px-4 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
                  >
                    {isRequestingPermission ? "Requesting..." : "Try Again - Request Permission"}
                  </button>
                </div>
                <div>
                  <p className="font-medium mb-2">Or fix manually:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click the lock icon (🔒) or info icon (ℹ️) in your browser's address bar</li>
                    <li>Find "Camera" and "Microphone" in the permissions list</li>
                    <li>Change them from "Ask" or "Block" to "Allow"</li>
                    <li>Click the "Try Again" button above or refresh the page</li>
                  </ol>
                </div>
                <p className="mt-2 text-xs">
                  <strong>Note:</strong> Even if your browser settings show "Allow", the site-specific permission for localhost might be different. Check the address bar icon.
                </p>
              </div>
            )}
            {error.includes("HTTPS") && (
              <div className="text-sm text-red-100 mt-3">
                <p>Make sure you're accessing the site via:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                  <li><code className="bg-red-700 px-1 rounded">http://localhost:3000</code></li>
                  <li><code className="bg-red-700 px-1 rounded">https://localhost:3000</code></li>
                  <li>Or any HTTPS URL</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="flex-1 relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Remote Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
            onLoadedMetadata={() => {
              console.log("Remote video metadata loaded");
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play().catch((err) => {
                  console.error("Auto-play prevented for remote video:", err);
                });
              }
            }}
            onError={(e) => {
              console.error("Remote video error:", e);
              setError("Failed to load remote video");
            }}
            onPlay={() => {
              console.log("Remote video started playing");
            }}
          />
          {connectionStatus === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Waiting for other participant...</p>
              </div>
            </div>
          )}
          {connectionStatus === "disconnected" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <p className="text-gray-400">Other participant disconnected</p>
            </div>
          )}
        </div>

        {/* Local Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            onLoadedMetadata={() => {
              console.log("Local video metadata loaded");
              if (localVideoRef.current) {
                localVideoRef.current.play().catch((err) => {
                  console.error("Auto-play prevented:", err);
                });
              }
            }}
            onError={(e) => {
              console.error("Local video error:", e);
              setError("Failed to load local video");
            }}
          />
          {!localStreamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400">Loading camera...</p>
              </div>
            </div>
          )}
          {isVideoOff && localStreamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <p className="text-gray-400">Camera Off</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            disabled={isLeaving}
          >
            {isMuted ? "🔇 Unmute" : "🎤 Mute"}
          </button>

          <button
            onClick={toggleVideo}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isVideoOff
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            disabled={isLeaving}
          >
            {isVideoOff ? "📷 Camera On" : "📷 Camera Off"}
          </button>

          <button
            onClick={handleEndCall}
            className="px-6 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700 transition-colors"
            disabled={isLeaving}
          >
            {isLeaving ? "Leaving..." : "End Call"}
          </button>
        </div>
      </div>
    </div>
  );
}

