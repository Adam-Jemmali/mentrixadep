import { NextResponse } from "next/server";

/**
 * This route intentionally returns 404 for any method.
 * The previous honeypot implementation was removed because it could
 * blacklist legitimate logged-in users when browser extensions or
 * crawlers probed common admin paths.
 */
export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export { GET as POST, GET as PUT, GET as DELETE };
