import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  securityHeaders,
  getClientIpFromRequest,
  checkRateLimitWithRetryAfter,
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
  "/api/auth/request-password-reset",
  "/auth/signin",
  "/auth/signup",
  "/auth/activate",
  "/auth/forgot-password",
  "/auth/confirm-reset",
  "/auth/reset-password",
  "/auth/callback",
  "/offline",
  "/sw.js",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/join",
  "/tutor/stripe/refresh",
  "/tutor/stripe/success",
  /** Marketing / legal — no session required (same route group as landing links in footer). */
  "/contact",
  "/privacy",
  "/terms",
]);

/** Public tutor profile pages: /tutor/[tutorId] (and nested public paths under /tutor/). */
const publicPrefixes = ["/tutor/"];

const authRoutesForRateLimit = ["/auth/signin", "/auth/signup"];

const authRoutes = ["/auth/signin", "/auth/signup"];
const pendingApprovalRoute = "/pending-approval";

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

function applySecurityHeaders(res: NextResponse): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (isDev && key === "Content-Security-Policy") return;
    res.headers.set(key, value);
  });
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
  return applySecurityHeaders(response);
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

  if (method === "OPTIONS") {
    return applySecurityHeaders(NextResponse.next({ request }));
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
      if (pathname === "/join") {
        url.pathname = "/auth/signup";
      }
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
    const { allowed, retryAfterSeconds } = checkRateLimitWithRetryAfter(
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

  const publicOk = isPublicRoute(pathname) || isPublicPrefixPath(pathname);

  if (!user && !publicOk) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return finalizeResponse(NextResponse.redirect(url), request, null);
  }

  if (user && authRoutes.includes(pathname)) {
    // Always prefer DB role/approval over auth metadata to avoid stale redirects.
    const { data: userData } = await supabase
      .from("users")
      .select("status, approved, role, is_blacklisted")
      .eq("id", user.id)
      .maybeSingle();

    const role = userData?.role;
    const accessStatus = normalizeAccessStatus(userData);

    if (accessStatus === "suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (accessStatus !== "approved") {
      const url = request.nextUrl.clone();
      url.pathname = pendingApprovalRoute;
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    const url = request.nextUrl.clone();
    url.pathname = getRoleHomePath(role!);
    return finalizeResponse(NextResponse.redirect(url), request, user.id);
  }

  if (user && !publicOk) {
    // Always prefer DB role/approval over auth metadata to avoid stale route guards.
    const { data: userData } = await supabase
      .from("users")
      .select("status, approved, role, is_blacklisted")
      .eq("id", user.id)
      .maybeSingle();

    const role = userData?.role;
    const accessStatus = normalizeAccessStatus(userData);

    // No role yet (new account awaiting role selection) — let them pick a role
    if (!role) {
      if (pathname === "/auth/select-role") {
        return finalizeResponse(supabaseResponse, request, user.id);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/auth/select-role";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (accessStatus === "suspended") {
      if (pathname === "/suspended") {
        return finalizeResponse(supabaseResponse, request, user.id);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (accessStatus !== "approved") {
      if (pathname === pendingApprovalRoute) {
        return finalizeResponse(supabaseResponse, request, user.id);
      }
      const url = request.nextUrl.clone();
      url.pathname = pendingApprovalRoute;
      return finalizeResponse(NextResponse.redirect(url), request, user.id);
    }

    if (!checkRouteAccess(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
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
