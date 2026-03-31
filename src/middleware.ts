import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security";
import { getRoleHomePath } from "@/lib/role-home";

const publicRoutes = [
  "/",
  "/api/health",
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  "/auth/select-role",
  "/api/stripe/webhook",
];

// Route prefixes that are publicly accessible (no auth required)
const publicPrefixes = ["/tutor/"];

const authRoutes = ["/auth/signin", "/auth/signup"];

/** Route access rules: which roles can access which route prefixes */
const routeRoleMap: Record<string, string[]> = {
  "/admin": ["admin"],
  "/dashboard": ["admin"],
  "/tutor": ["tutor", "admin"],
  "/student": ["student", "admin"],
};

function checkRouteAccess(pathname: string, role: string): boolean {
  for (const [prefix, allowedRoles] of Object.entries(routeRoleMap)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(role)) {
      return false;
    }
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Enforce request size limits
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const MAX_REQUEST_SIZE = 550 * 1024 * 1024; // 550MB
    if (size > MAX_REQUEST_SIZE) {
      return new NextResponse(
        JSON.stringify({ error: "Request too large. Maximum size is 500MB." }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = publicRoutes.includes(pathname);
  const isPublicPrefix = publicPrefixes.some(
    (prefix) => pathname.startsWith(prefix) && pathname !== prefix.slice(0, -1)
  );
  const isAuthRoute = authRoutes.includes(pathname);

  // Redirect unauthenticated users to sign in (skip public prefixes like /tutor/[id])
  if (!user && !isPublicRoute && !isPublicPrefix) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    let role = user.user_metadata?.role as string | undefined;
    let approved =
      user.user_metadata?.approved === true ||
      user.user_metadata?.approved === "true";

    if (!role || approved === undefined) {
      const { data: userData } = await supabase
        .from("users")
        .select("approved, role")
        .eq("id", user.id)
        .single();

      role = userData?.role;
      approved = !!userData?.approved;
    }

    const url = request.nextUrl.clone();
    url.pathname = approved ? getRoleHomePath(role) : "/pending-approval";
    return NextResponse.redirect(url);
  }

  // Role-based access control for authenticated users on protected routes
  if (user && !isPublicRoute && !isPublicPrefix) {
    // Resolve role and approval from JWT metadata, falling back to DB
    let role = user.user_metadata?.role as string | undefined;
    let approved =
      user.user_metadata?.approved === true ||
      user.user_metadata?.approved === "true";

    if (!role || approved === undefined) {
      const { data: userData } = await supabase
        .from("users")
        .select("approved, role")
        .eq("id", user.id)
        .single();

      role = userData?.role;
      approved = !!userData?.approved;
    }

    // Unapproved users go to pending-approval
    if (!approved) {
      if (pathname !== "/pending-approval") {
        const url = request.nextUrl.clone();
        url.pathname = "/pending-approval";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Check route-level authorization
    if (role && !checkRouteAccess(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      return NextResponse.redirect(url);
    }

    if (role) supabaseResponse.headers.set("x-user-role", role);
    supabaseResponse.headers.set("x-user-id", user.id);
  }

  // Security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    supabaseResponse.headers.set(key, value);
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude Sentry tunnel route, Next internals, static files
    "/((?!monitoring|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
