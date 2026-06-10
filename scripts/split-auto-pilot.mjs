#!/usr/bin/env node
/** Split features/studio-ai/auto-pilot.ts into capability files. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.join(path.dirname(__dirname), "src/features/studio-ai");
const src = fs.readFileSync(path.join(STUDIO, "auto-pilot.ts"), "utf8").split("\n");

function slice(start, end) {
  return src.slice(start - 1, end).join("\n");
}

const transcriptionInternal = `import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { GoogleGenAI, type File as GeminiFile } from "@google/genai";

${slice(149, 295)}
`;

const transcriptionInternalExported = transcriptionInternal
  .replace(/^const INLINE_TRANSCRIBE_MAX_BYTES/m, "export const INLINE_TRANSCRIBE_MAX_BYTES")
  .replace(/^async function ensureRecordingTranscriptionJob/m, "export async function ensureRecordingTranscriptionJob");

const transcriptionJobsHeader = `"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { validateUUID } from "@/shared/core/security";
import { z } from "zod";
import {
  analyzeRecordingForStudioContextFromFile,
} from "@/shared/integrations/ai";
import { getGeminiApiKey } from "@/shared/core/env";
import { GoogleGenAI } from "@google/genai";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  OFFLOAD_TRANSCRIBE_MAX_BYTES,
  claimNextRecordingTranscriptionJob,
  markRecordingTranscriptionJobRetry,
  waitForGeminiFileActive,
} from "@/features/studio-ai/transcription-internal";

`;
// Export private helpers used only by transcription-jobs from internal file
const transcriptionInternalWithJobHelpers = transcriptionInternalExported
  .replace(/^async function claimNextRecordingTranscriptionJob/m, "export async function claimNextRecordingTranscriptionJob")
  .replace(/^async function waitForGeminiFileActive/m, "export async function waitForGeminiFileActive")
  .replace(/^async function markRecordingTranscriptionJobRetry/m, "export async function markRecordingTranscriptionJobRetry")
  .replace(/^const OFFLOAD_TRANSCRIBE_MAX_BYTES/m, "export const OFFLOAD_TRANSCRIBE_MAX_BYTES");

const transcriptionJobs = transcriptionJobsHeader + slice(296, 496);

const studioInternal = `import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { SessionAiPackage } from "@/shared/types/database";
import type { NormalizedStudioPackage } from "@/features/studio-ai/studio-package-lib";
import {
  sendAiPackageReadyEmail,
  type SessionEmailDetails,
} from "@/shared/integrations/email";

${slice(140, 147)}

${slice(810, 897)
  .replace(/^function normalizedToDbRow/m, "export function normalizedToDbRow")
  .replace(/^async function sendStudioPackageReadyEmail/m, "export async function sendStudioPackageReadyEmail")
  .replace(/^async function clearStudioPackageWithdrawnAt/m, "export async function clearStudioPackageWithdrawnAt")}
`;

const studioPackagesHeader = `"use server";

import { requireRole, requireAuth } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { validateUUID } from "@/shared/core/security";
import {
  analyzeRecordingForStudioContext,
  generateStudioSessionPackage,
} from "@/shared/integrations/ai";
import { revalidatePath } from "next/cache";
import type { SessionAiPackage } from "@/shared/types/database";
import type { NormalizedStudioPackage } from "@/features/studio-ai/studio-package-lib";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import {
  INLINE_TRANSCRIBE_MAX_BYTES,
  ensureRecordingTranscriptionJob,
} from "@/features/studio-ai/transcription-internal";
import {
  clearStudioPackageWithdrawnAt,
  normalizedToDbRow,
  sendStudioPackageReadyEmail,
  type SessionRowForPackage,
} from "@/features/studio-ai/studio-internal";

`;
const studioPackages =
  studioPackagesHeader +
  slice(28, 138) +
  "\n\n" +
  slice(498, 808) +
  "\n\n" +
  slice(904, src.length);

fs.writeFileSync(path.join(STUDIO, "transcription-internal.ts"), transcriptionInternalWithJobHelpers);
fs.writeFileSync(path.join(STUDIO, "transcription-jobs.ts"), transcriptionJobs);
fs.writeFileSync(path.join(STUDIO, "studio-internal.ts"), studioInternal);
fs.writeFileSync(path.join(STUDIO, "studio-packages.ts"), studioPackages);
fs.unlinkSync(path.join(STUDIO, "auto-pilot.ts"));

console.log("Split auto-pilot.ts → transcription-internal, transcription-jobs, studio-internal, studio-packages");
