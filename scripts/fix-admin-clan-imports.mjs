#!/usr/bin/env node
/** Update imports after admin + clan splits. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const ADMIN_MAP = {
  getRegistrationRequests: "@/features/admin/registration-queue",
  approveRegistrationRequest: "@/features/admin/registration-queue",
  rejectRegistrationRequest: "@/features/admin/registration-queue",
  reinstateRejectedRegistrationRequest: "@/features/admin/registration-queue",
  getAutoApproveRegistrations: "@/features/admin/registration-queue",
  toggleAutoApproveRegistrations: "@/features/admin/registration-queue",
  approveAllPendingRegistrations: "@/features/admin/registration-queue",
  getAllUsers: "@/features/admin/admin-users",
  suspendUser: "@/features/admin/admin-users",
  unsuspendUser: "@/features/admin/admin-users",
  promoteToAdmin: "@/features/admin/admin-users",
  getUserDetail: "@/features/admin/admin-users",
  AdminUser: "@/features/admin/admin-users",
  getAllUnverifiedTutorCourses: "@/features/admin/tutor-courses-admin",
  verifyTutorCourse: "@/features/admin/tutor-courses-admin",
  unverifyTutorCourse: "@/features/admin/tutor-courses-admin",
  getTutorCoursesForAdmin: "@/features/admin/tutor-courses-admin",
  getPlatformMetrics: "@/features/admin/admin-dashboard",
  PlatformMetrics: "@/features/admin/admin-dashboard",
  getSystemSettings: "@/features/admin/system-settings",
  updateSystemSetting: "@/features/admin/system-settings",
  SystemSettings: "@/features/admin/system-settings",
};

const CLAN_MAP = {
  getMyClan: "@/features/clans/clan-membership",
  createClan: "@/features/clans/clan-membership",
  joinClanByCode: "@/features/clans/clan-membership",
  leaveClan: "@/features/clans/clan-membership",
  regenerateInviteCode: "@/features/clans/clan-membership",
  areUsersInSameClan: "@/features/clans/clan-membership",
  requestJoinPublicClan: "@/features/clans/clan-membership",
  ClanMemberRow: "@/features/clans/clan-membership",
  MyClanResult: "@/features/clans/clan-membership",
  CreateClanOptions: "@/features/clans/clan-membership",
  uploadClanAvatar: "@/features/clans/clan-customization",
  setClanAvatarPreset: "@/features/clans/clan-customization",
  setClanFocusDivision: "@/features/clans/clan-customization",
  getPublicClanSnapshot: "@/features/clans/clan-reads",
  getClanDashboard: "@/features/clans/clan-reads",
  getTopPublicClans: "@/features/clans/clan-reads",
  searchPublicClans: "@/features/clans/clan-reads",
  PublicClanSnapshot: "@/features/clans/clan-reads",
  PublicClanBrowseRow: "@/features/clans/clan-reads",
  ClanDashboardPayload: "@/features/clans/clan-reads",
  postClanMessage: "@/features/clans/clan-messages",
  listClanMessages: "@/features/clans/clan-messages",
  ClanMessageRow: "@/features/clans/clan-messages",
  recordClanQuestCompletion: "@/features/clans/clan-events",
  recordClanDuelWin: "@/features/clans/clan-events",
  approveJoinRequest: "@/features/clans/clan-join-requests",
  rejectJoinRequest: "@/features/clans/clan-join-requests",
  listPendingJoinRequests: "@/features/clans/clan-join-requests",
};

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules" && ent.name !== ".next") walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function rewriteAdminImports(content) {
  if (!content.includes("@/features/admin/admin")) return content;
  const specifiers = new Set();
  const typeSpecifiers = new Set();
  const importRe = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+"@\/features\/admin\/admin";?/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const isType = Boolean(m[1]);
    for (const part of m[2].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      (isType ? typeSpecifiers : specifiers).add(name);
    }
  }
  content = content.replace(importRe, "");
  const byPath = new Map();
  for (const name of [...specifiers, ...typeSpecifiers]) {
    const target = ADMIN_MAP[name];
    if (!target) {
      console.warn("unknown admin export:", name);
      continue;
    }
    if (!byPath.has(target)) byPath.set(target, { values: [], types: [] });
    const bucket = byPath.get(target);
    (typeSpecifiers.has(name) ? bucket.types : bucket.values).push(name);
  }
  const newImports = [];
  for (const [target, { values, types }] of byPath) {
    if (values.length) newImports.push(`import { ${values.join(", ")} } from "${target}";`);
    if (types.length) newImports.push(`import type { ${types.join(", ")} } from "${target}";`);
  }
  return newImports.join("\n") + (newImports.length ? "\n" : "") + content;
}

function rewriteClanImports(content) {
  let changed = content;
  for (const oldPath of ["@/features/clans/clan-crud", "@/features/clans/clan-dashboard"]) {
    if (!changed.includes(oldPath)) continue;
    const specifiers = new Set();
    const typeSpecifiers = new Set();
    const importRe = new RegExp(
      `import\\s+(type\\s+)?\\{([^}]+)\\}\\s+from\\s+"${oldPath.replace(/\//g, "\\/")}";?`,
      "g",
    );
    let m;
    while ((m = importRe.exec(changed)) !== null) {
      const isType = Boolean(m[1]);
      for (const part of m[2].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        (isType ? typeSpecifiers : specifiers).add(name);
      }
    }
    changed = changed.replace(importRe, "");
    const byPath = new Map();
    for (const name of [...specifiers, ...typeSpecifiers]) {
      const target = CLAN_MAP[name];
      if (!target) {
        console.warn("unknown clan export:", name, "from", oldPath);
        continue;
      }
      if (!byPath.has(target)) byPath.set(target, { values: [], types: [] });
      const bucket = byPath.get(target);
      (typeSpecifiers.has(name) ? bucket.types : bucket.values).push(name);
    }
    const newImports = [];
    for (const [target, { values, types }] of byPath) {
      if (values.length) newImports.push(`import { ${values.join(", ")} } from "${target}";`);
      if (types.length) newImports.push(`import type { ${types.join(", ")} } from "${target}";`);
    }
    changed = newImports.join("\n") + (newImports.length ? "\n" : "") + changed;
  }
  return changed;
}

let count = 0;
for (const file of walk(path.join(ROOT, "src"))) {
  let content = fs.readFileSync(file, "utf8");
  const next = rewriteClanImports(rewriteAdminImports(content));
  if (next !== content) {
    fs.writeFileSync(file, next);
    console.log("updated", path.relative(ROOT, file));
    count++;
  }
}
console.log(`\n${count} files updated`);
