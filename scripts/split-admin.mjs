#!/usr/bin/env node
/** Split features/admin/admin.ts into capability files. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ADMIN = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/features/admin");
const src = fs.readFileSync(path.join(ADMIN, "admin.ts"), "utf8").split("\n");

function slice(start, end) {
  return src.slice(start - 1, end).join("\n");
}

const adminInternal = `import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { emailSchema } from "@/shared/core/security";

${slice(10, 32)}
`.replace(/^async function findAuthUserByEmail/m, "export async function findAuthUserByEmail");

const registrationQueue = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { sendWaitlistDecisionEmail } from "@/shared/integrations/email";
import { findAuthUserByEmail } from "@/features/admin/admin-internal";

${slice(34, 268)}

${slice(279, 377)}
`;

const adminUsers = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";

${slice(270, 277)}

${slice(379, 438)}

${slice(593, 657)}
`;

const tutorCoursesAdmin = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError } from "@/shared/core/security";

${slice(444, 518)}
`;

const adminDashboard = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

${slice(524, 587)}
`;

const systemSettings = `"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { sanitizeError } from "@/shared/core/security";
import { z } from "zod";

${slice(663, 710)}
`;

const files = {
  "admin-internal.ts": adminInternal,
  "registration-queue.ts": registrationQueue,
  "admin-users.ts": adminUsers,
  "tutor-courses-admin.ts": tutorCoursesAdmin,
  "admin-dashboard.ts": adminDashboard,
  "system-settings.ts": systemSettings,
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(ADMIN, name), content.endsWith("\n") ? content : content + "\n");
  console.log("wrote", name);
}

fs.unlinkSync(path.join(ADMIN, "admin.ts"));
console.log("removed admin.ts");
