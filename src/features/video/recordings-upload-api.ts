import { NextResponse } from "next/server";
import { saveSessionRecordingFromFormData } from "@/features/video/save-session-recording";

/** Large WebM/MP4 segments can exceed the default Server Actions body cap. */
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await saveSessionRecordingFromFormData(formData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/recordings/upload]", error);
    return NextResponse.json(
      { success: false, error: "Upload failed unexpectedly." },
      { status: 500 },
    );
  }
}
