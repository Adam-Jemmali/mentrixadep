import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  securityHeaders,
  getClientIpFromRequest,
  checkSlidingWindowRateLimit,
  RATE_LIMITS,
  getMaxBodyBytesForPath,
  validateApiCsrf,
  isCsrfExemptPath,
  redactUserIdForLogs,
  scrubLogValue,
} from "@/lib/security";
import { reportMiddlewareHttpError } from "@/lib/observability";
import { getRoleHomePath } from "@/lib/role-home";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SEC } from "@/lib/referral-constants";
import { normalizeAccessStatus } from "@/lib/user-access-status";
import { waitlistRoleFromQuery } from "@/lib/waitlist-role";

/**
 * Exact paths that do not require a session (plus publicPrefixes below).
 * Note: /api/stripe/webhook is also excluded from the middleware matcher so the route
 * receives the raw body for signature verification — never add body limits there.
 */
const publicRoutes = new Set([
  "/",
  "/api/health",
  "/api/waitlist/join",
  "/api/waitlist/status",
  /** Optional-auth: handler uses getCurrentUser(); avoids redirect for guests with ?ref cookie */
  "/api/referral/finalize",
  "/api/auth/signin",
  "/api/auth/signup",
  /** POST: JSON next path after GIS `signInWithIdToken` (session in cookies; handler validates). */
  "/api/auth/oauth-next",
  "/api/auth/request-password-reset",
  /** Stripe redirects here when Checkout is cancelled — unlock slot without requiring session cookie. */
  "/api/stripe/checkout/cancel-return",
  "/api/guest-practice",
  "/auth/signin",
  "/auth/signup",
  "/auth/activate",
  "/auth/forgot-password",
  "/auth/confirm-reset",
  "/auth/reset-password",
  "/auth/callback",
  /** Server redirect: sync waitlist approval then send users to dashboard (avoids stuck on pending). */
  "/auth/session-sync",
  "/maintenance",
  "/offline",
  "/sw.js",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/tutor/stripe/refresh",
  "/tutor/stripe/success",
  /** Marketing / legal — no session required (same route group as landing links in footer). */
  "/contact",
  "/privacy",
  "/terms",
  /** Guest quest demo — no auth required, uses rate limiting via cookies */
  "/try",
]);

/** Public tutor profile pages: /tutor/[tutorId] (and nested public paths under /tutor/). */
const publicPrefixes = ["/tutor/"];

const authRoutesForRateLimit = ["/auth/signin", "/auth/signup"];

const authRoutes = ["/auth/signin", "/auth/signup"];
const maintenanceRoute = "/maintenance";

async function hasApprovedRegistrationByEmail(
  supabaseUrl: string,
  serviceRoleKey: string | null | undefined,
  email: string | null | undefined,
): Promise<boolean> {
  const normEmail = (email ?? "").trim().toLowerCase();
  const serviceKey = serviceRoleKey?.trim();
  if (!normEmail || !serviceKey) return false;
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/registration_request_by_identity_email`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ p_email: normEmail }),
      cache: "no-store",
    });
    if (rpcRes.ok) {
      const rpcData: unknown = await rpcRes.json();
      const row =
        Array.isArray(rpcData) && rpcData.length > 0
          ? (rpcData[0] as { status?: string | null })
          : ((rpcData ?? null) as { status?: string | null } | null);
      if (row && (row.status ?? "").toLowerCase() === "approved") {
        return true;
      }
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/registration_requests?select=status&email=eq.${encodeURIComponent(normEmail)}&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    const rows: Array<{ status?: string | null }> = await res.json();
    return (rows[0]?.status ?? "").toLowerCase() === "approved";
  } catch {
    return false;
  }
}

/** App Router pages do not handle OPTIONS; extensions / probes get 405. Reply 204 early for public auth entry paths. */
const publicAuthPageOptions204 = new Set([
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/confirm-reset",
  "/auth/activate",
]);

const routeRoleMap: Record<string, string[]> = {
  "/admin": ["admin"],
  "/dashboard": ["admin"],
  "/tutor": ["tutor", "admin"],
  "/student": ["student", "admin"],
  "/institution": ["student", "tutor", "admin"],
};

/** /student/[uuid] learner profile — tutors may view (not the main /student dashboard). */
function isStudentProfileViewPath(pathname: string): boolean {
  return /^\/student\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(
    pathname,
  );
}

function checkRouteAccess(pathname: string, role: string): boolean {
  if (isStudentProfileViewPath(pathname)) {
    return role === "student" || role === "tutor" || role === "admin";
  }
  for (const [prefix, allowedRoles] of Object.entries(routeRoleMap)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(role)) {
      return false;
    }
  }
  return true;
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.has(pathname);
}

function isPublicPrefixPath(pathname: string): boolean {
  return publicPrefixes.some(
    (prefix) => pathname.startsWith(prefix) && pathname !== prefix.slice(0, -1)
  );
}

function applySecurityHeaders(res: NextResponse, pathname?: string): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  /** Email clients / in-app browsers load links in iframes; skip DENY + relax CSP frame-ancestors (avoids ERR_BLOCKED_BY_RESPONSE). */
  const allowFramedAuthEntryPaths =
    pathname === "/auth/activate" ||
    pathname === "/auth/callback" ||
    pathname === "/auth/signup" ||
    pathname === "/auth/session-sync";
  /**
   * Google Identity Services (FedCM / Sign in with Google) uses cross-origin messaging.
   * Sending COOP on auth routes has triggered postMessage failures in Chrome alongside GIS.
   * Rest of the app keeps `same-origin-allow-popups`.
   */
  const skipCoopForAuthSection = pathname != null && pathname.startsWith("/auth/");

  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (skipCoopForAuthSection && key === "Cross-Origin-Opener-Policy") return;
    if (allowFramedAuthEntryPaths && key === "X-Frame-Options") return;
    if (isDev && key === "Content-Security-Policy") return;

    if (allowFramedAuthEntryPaths && key === "Content-Security-Policy") {
      res.headers.set(
        key,
        value.replace("frame-ancestors 'none'", "frame-ancestors *"),
      );
      return;
    }

    res.headers.set(key, value);
  });
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  return res;
}

function finalizeResponse(
  response: NextResponse,
  request: NextRequest,
  userId: string | null
): NextResponse {
  const status = response.status;
  if (status >= 400) {
    const safePath = scrubLogValue(request.nextUrl.pathname);
    reportMiddlewareHttpError({
      status,
      pathname: safePath,
      method: request.method,
      userIdRedacted: redactUserIdForLogs(userId),
    });
  }
  return applySecurityHeaders(response, request.nextUrl.pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  // Supabase can fallback recovery links to SITE_URL (/). Normalize here server-side.
  if (pathname === "/" && method === "GET") {
    const errorCode = searchParams.get("error_code");
    if (errorCode === "otp_expired") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/forgot-password";
      url.search = "?error=expired";
      return finalizeResponse(NextResponse.redirect(url), request, null);
    }

    const type = searchParams.get("type");
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    if (type === "recovery" && (code || tokenHash)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/reset-password";
      url.search = "";
      if (code) url.searchParams.set("code", code);
      if (tokenHash) {
        url.searchParams.set("token_hash", tokenHash);
        url.searchParams.set("type", "recovery");
      }
      return finalizeResponse(NextResponse.redirect(url), request, null);
    }
  }

  if (method === "OPTIONS" && publicAuthPageOptions204.has(pathname)) {
    // Reply 204 early for all OPTIONS probes to avoid 405 Method Not Allowed on page routes.
    return applySecurityHeaders(new NextResponse(null, { status: 204 }), pathname);
  }

  // New users choose role on signup first; /auth/signin?signin=1 is for returning sign-in only.
  if (pathname === "/auth/signin" && method === "GET") {
    const signinMode = searchParams.get("signin") === "1";
    const passwordReset = searchParams.get("reset") === "1";
    if (!signinMode && !passwordReset) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signup";
      url.search = "";
      const role = waitlistRoleFromQuery(searchParams.get("role"));
      url.searchParams.set("role", role);
      for (const key of ["error", "email", "redirect"] as const) {
        const value = searchParams.get(key);
        if (value) url.searchParams.set(key, value);
      }
      return finalizeResponse(NextResponse.redirect(url), request, null);
    }
  }

  // Referral link ?ref=CODE — persist cookie and strip query (clean URLs).
  const refRaw = request.nextUrl.searchParams.get("ref");
  if (refRaw && method === "GET") {
    const normalized = refRaw
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    if (normalized.length === 8) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("ref");
      const res = NextResponse.redirect(url);
      res.cookies.set({
        name: REFERRAL_COOKIE_NAME,
        value: normalized,
        path: "/",
        maxAge: REFERRAL_COOKIE_MAX_AGE_SEC,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return finalizeResponse(res, request, null);
    }
  }

  // --- Request size (Content-Length only; body not read — safe for all routes in matcher) ---
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!Number.isFinite(size) || size < 0) {
      return finalizeResponse(
        new NextResponse(JSON.stringify({ error: "Invalid Content-Length" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
        request,
        null
      );
    }
    const maxBytes = getMaxBodyBytesForPath(pathname);
    if (size > maxBytes) {
      return finalizeResponse(
        new NextResponse(
          JSON.stringify({
            error: `Request too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))}MB for this route.`,
          }),
          {
            status: 413,
            headers: { "Content-Type": "application/json" },
          }
        ),
        request,
        null
      );
    }
  }

  // --- Per-IP rate limit: auth sign-in / sign-up (POST only).
  // GET/RSC navigations must not count — dev prefetch + HMR can exceed a low cap in seconds.
  // Skip in development so local testing is not blocked by hot reload or repeated attempts.
  const rateLimitAuthPost =
    method === "POST" &&
    authRoutesForRateLimit.includes(pathname) &&
    process.env.NODE_ENV === "production";

  if (rateLimitAuthPost) {
    const ip = getClientIpFromRequest(request);
    const key = `mw-auth:${ip}:${pathname}`;
    const { maxRequests, windowMs } = RATE_LIMITS.authPage;
    const { allowed, retryAfterSeconds } = await checkSlidingWindowRateLimit(
      key,
      maxRequests,
      windowMs
    );
    if (!allowed) {
      return finalizeResponse(
        new NextResponse(
          JSON.stringify({ error: "Too many requests. Try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(retryAfterSeconds),
            },
          }
        ),
        request,
        null
      );
    }
  }

  // --- CSRF for App Router API routes (not Server Actions; not exempt paths) ---
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (
    mutating &&
    pathname.startsWith("/api/") &&
    !isCsrfExemptPath(pathname) &&
    !validateApiCsrf(request)
  ) {
    return finalizeResponse(
      new NextResponse(JSON.stringify({ error: "Invalid CSRF or origin" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
      request,
      null
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnon) {
    console.error("[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const fallback = request.nextUrl.clone();
    fallback.pathname = "/auth/signin";
    return finalizeResponse(NextResponse.redirect(fallback), request, null);
  }

  try {
    return await runSupabaseAuthGuard(request, supabaseUrl, supabaseAnon);
  } catch (err) {
    console.error("[middleware] auth guard failed:", err);
    const fallback = request.nextUrl.clone();
    fallback.pathname = "/auth/signin";
    return finalizeResponse(NextResponse.redirect(fallback), request, null);
  }
}

async function runSupabaseAuthGuard(
  request: NextRequest,
  supabaseUrl: string,
  supabaseAnon: string
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cachedUserData:
    | { status?: string | null; approved?: boolean | null; role?: string | null; is_blacklisted?: boolean | null }
    | null
    | undefined;
  const getUserData = async () => {
    if (!user) return null;
    if (cachedUserData !== undefined) return cachedUserData;
    const { data } = await supabase
      .from("users")
      .select("status, approved, role, is_blacklisted")
      .eq("id", user.id)
      .maybeSingle();
    cachedUserData = data;
    return data;
  };

  let maintenanceMode = false;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleKey) {
    try {
      const maintenanceRes = await fetch(
        `${supabaseUrl}/rest/v1/system_settings?key=eq.maintenance_mode&select=value&limit=1`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );
      if (maintenanceRes.ok) {
        const rows: Array<{ value?: { enabled?: boolean } }> = await maintenanceRes.json();
        maintenanceMode = rows[0]?.value?.enabled === true;
      }
    } catch (err) {
      console.error("[middleware] service-role maintenance fetch failed:", err);
    }
  }
  if (!maintenanceMode) {
    const { data: maintenanceSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle();
    maintenanceMode = maintenanceSetting?.value?.enabled === true;
  }

  const publicOk = isPublicRoute(pathname) || isPublicPrefixPath(pathname);

  if (
    maintenanceMode &&
    user &&
    !publicOk &&
    pathname !== maintenanceRoute &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/")
  ) {
    const userData = await getUserData();
    if (userData?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = maintenanceRoute;
      url.search = "";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }
  }

  if (!maintenanceMode && pathname === maintenanceRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return finalizeResponse(NextResponse.redirect(url), request, null);
    }
    const userData = await getUserData();
    const role = userData?.role;
    const url = request.nextUrl.clone();
    url.pathname = role ? getRoleHomePath(role) : "/auth/select-role";
    url.search = "";
    return finalizeResponse(NextResponse.redirect(url), request, user.id);
  }

  if (!user && !publicOk) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return finalizeResponse(NextResponse.redirect(url), request, null);
  }

  if (user && authRoutes.includes(pathname)) {
    // Always prefer DB role/approval over auth metadata to avoid stale redirects.
    const userData = await getUserData();

    const role = userData?.role;
    const accessStatus = normalizeAccessStatus(userData);

    if (accessStatus === "suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      url.search = "";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (accessStatus !== "approved") {
      const isApprovedInOnboarding = await hasApprovedRegistrationByEmail(
        supabaseUrl,
        serviceRoleKey,
        user.email,
      );
      if (isApprovedInOnboarding) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/session-sync";
        url.search = "";
        return finalizeResponse(NextResponse.redirect(url), request, user.id);
      }
      // Not approved and not in onboarding: let the auth page render as-is.
      // Redirecting to /auth/signin?error=... would loop because /auth/signin
      // is itself an authRoute and would trigger this block again infinitely.
      return finalizeResponse(supabaseResponse, request, user.id);
    }

    const url = request.nextUrl.clone();
    url.pathname = getRoleHomePath(role!);
    // Do not carry ?error=* or other auth query params onto /student or /tutor.
    url.search = "";
    return finalizeResponse(NextResponse.redirect(url), request, user.id);
  }

  if (user && !publicOk) {
    // Always prefer DB role/approval over auth metadata to avoid stale route guards.
    const userData = await getUserData();

    const role = userData?.role;
    const accessStatus = normalizeAccessStatus(userData);

    // No role yet (new account awaiting role selection) — let them pick a role
    if (!role) {
      if (pathname === "/auth/select-role") {
        return finalizeResponse(supabaseResponse, request, user.id);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/auth/select-role";
      url.search = "";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (accessStatus === "suspended") {
      if (pathname === "/suspended") {
        return finalizeResponse(supabaseResponse, request, user.id);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      url.search = "";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (accessStatus !== "approved") {
      const isApprovedInOnboarding = await hasApprovedRegistrationByEmail(
        supabaseUrl,
        serviceRoleKey,
        user.email,
      );
      if (isApprovedInOnboarding) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/session-sync";
        url.search = "";
        return finalizeResponse(NextResponse.redirect(url), request, user.id);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.search = "?error=approval_required";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (!checkRouteAccess(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      url.search = "";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    supabaseResponse.headers.set("x-user-role", role);
    supabaseResponse.headers.set("x-user-id", user.id);
  }

  return finalizeResponse(supabaseResponse, request, user?.id ?? null);
}

export const config = {
  matcher: [
    // Never run middleware on Stripe webhooks (raw body + signature verification).
    // Also exclude Next internals, static assets.
    "/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
