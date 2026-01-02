import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security";

const publicRoutes = ["/", "/auth/signin", "/auth/signup", "/auth/callback"];
const authRoutes = ["/auth/signin", "/auth/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
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
  const isAuthRoute = authRoutes.includes(pathname);

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicRoute) {
    // Use JWT metadata instead of database query for better scalability
    // This avoids hitting the database on every request (critical for 5k+ users)
    const userRole = user.user_metadata?.role as string | undefined;
    const approved = user.user_metadata?.approved === true || user.user_metadata?.approved === "true";

    // Fallback to database query only if JWT metadata is missing (shouldn't happen in production)
    if (!userRole || approved === undefined) {
      const { data: userData } = await supabase
        .from("users")
        .select("approved, role")
        .eq("id", user.id)
        .single();

      if (!userData || !userData.approved) {
        if (pathname !== "/pending-approval") {
          const url = request.nextUrl.clone();
          url.pathname = "/pending-approval";
          return NextResponse.redirect(url);
        }
        return supabaseResponse;
      }

      const finalRole = userData.role;
      if (pathname.startsWith("/admin") && finalRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith("/tutor") && finalRole !== "tutor" && finalRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith("/student") && finalRole !== "student" && finalRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      supabaseResponse.headers.set("x-user-role", finalRole);
      supabaseResponse.headers.set("x-user-id", user.id);
      return supabaseResponse;
    }

    if (!approved) {
      if (pathname !== "/pending-approval") {
        const url = request.nextUrl.clone();
        url.pathname = "/pending-approval";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (pathname.startsWith("/admin") && userRole !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/tutor") && userRole !== "tutor" && userRole !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/student") && userRole !== "student" && userRole !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    supabaseResponse.headers.set("x-user-role", userRole);
    supabaseResponse.headers.set("x-user-id", user.id);
  }

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    supabaseResponse.headers.set(key, value);
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

