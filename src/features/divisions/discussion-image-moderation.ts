import sharp from "sharp";
import { logSecurityEvent } from "@/shared/core/security";

export const DISCUSSION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const DISCUSSION_IMAGE_MAX_EDGE = 4096;

type SafeSearchLevel = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";

type VisionSafeSearch = {
  adult?: SafeSearchLevel;
  violence?: SafeSearchLevel;
  racy?: SafeSearchLevel;
};

function isUnsafeLevel(level: SafeSearchLevel | undefined): boolean {
  return level === "LIKELY" || level === "VERY_LIKELY";
}

async function moderateWithGoogleVision(buffer: Buffer): Promise<{ safe: true } | { safe: false; reason: string }> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey) return { safe: true };

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: buffer.toString("base64") },
            features: [{ type: "SAFE_SEARCH_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    logSecurityEvent("division_image_vision_failed", { status: response.status });
    return { safe: false, reason: "Screenshot could not be verified. Try again or post without an image." };
  }

  const json = (await response.json()) as {
    responses?: Array<{ safeSearchAnnotation?: VisionSafeSearch }>;
  };
  const annotation = json.responses?.[0]?.safeSearchAnnotation;
  if (!annotation) return { safe: true };

  if (
    isUnsafeLevel(annotation.adult) ||
    isUnsafeLevel(annotation.violence) ||
    isUnsafeLevel(annotation.racy)
  ) {
    logSecurityEvent("division_image_rejected_vision", {
      adult: annotation.adult,
      violence: annotation.violence,
      racy: annotation.racy,
    });
    return {
      safe: false,
      reason: "That screenshot did not pass safety review. Study-related images only.",
    };
  }

  return { safe: true };
}

/** Re-encode with sharp (strip metadata) and run optional Vision Safe Search. */
export async function processDiscussionScreenshot(
  input: Buffer,
): Promise<
  | { ok: true; buffer: Buffer; contentType: "image/jpeg" | "image/png"; width: number; height: number }
  | { ok: false; error: string }
> {
  if (input.byteLength <= 0) {
    return { ok: false, error: "Screenshot file is empty." };
  }
  if (input.byteLength > DISCUSSION_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Screenshot must be 5MB or smaller." };
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    return { ok: false, error: "That file is not a valid image." };
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 32 || height < 32) {
    return { ok: false, error: "Screenshot is too small." };
  }
  if (width > DISCUSSION_IMAGE_MAX_EDGE || height > DISCUSSION_IMAGE_MAX_EDGE) {
    return { ok: false, error: "Screenshot dimensions are too large." };
  }

  const visionCheck = await moderateWithGoogleVision(input);
  if (!visionCheck.safe) {
    return { ok: false, error: visionCheck.reason };
  }

  const isPng = meta.format === "png";
  const pipeline = sharp(input, { failOn: "error" }).rotate().withMetadata({
    exif: undefined,
    icc: undefined,
  });

  const buffer = isPng
    ? await pipeline.png({ compressionLevel: 9, force: true }).toBuffer()
    : await pipeline.jpeg({ quality: 85, mozjpeg: true, force: true }).toBuffer();

  if (buffer.byteLength > DISCUSSION_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Screenshot is too large after processing." };
  }

  return {
    ok: true,
    buffer,
    contentType: isPng ? "image/png" : "image/jpeg",
    width,
    height,
  };
}
