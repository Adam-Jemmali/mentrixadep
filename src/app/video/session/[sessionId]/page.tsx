import { redirect } from "next/navigation";
import { validateJoinRequest } from "@/app/actions/video";
import { getCurrentUser } from "@/lib/auth";
import { VideoCall } from "@/components/video-call";

interface VideoSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function VideoSessionPage({
  params,
}: VideoSessionPageProps) {
  const { sessionId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Validate join request and get room details
  let roomData;
  try {
    roomData = await validateJoinRequest(sessionId);
  } catch (error) {
    // If room doesn't exist, try to create it
    if (error instanceof Error && error.message.includes("not found")) {
      const { createVideoRoom } = await import("@/app/actions/video");
      try {
        const createResult = await createVideoRoom(sessionId);
        if (createResult.success && createResult.room) {
          roomData = {
            success: true,
            room: createResult.room,
            role: user.role === "student" ? "student" : "tutor",
          };
        } else {
          throw new Error("Failed to create video room");
        }
      } catch (createError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Unable to Join Call</h1>
              <p className="text-gray-400 mb-4">
                {createError instanceof Error
                  ? createError.message
                  : "An error occurred"}
              </p>
              <a
                href="/dashboard"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        );
      }
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Unable to Join Call</h1>
            <p className="text-gray-400 mb-4">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <a
              href="/dashboard"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  if (!roomData || !roomData.room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Video Room Not Found</h1>
          <a
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <VideoCall
      sessionId={sessionId}
      roomId={roomData.room.id}
      roomToken={roomData.room.room_token}
      userRole={roomData.role}
      userId={user.id}
    />
  );
}

