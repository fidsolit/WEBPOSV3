import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/pos", "/inventory"];

export function middleware(request: NextRequest) {
  console.log("MIDDLEWARE TRIGGERED ON by fidel:", request.nextUrl.pathname);
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtected) return NextResponse.next();

  // Use the specific cookie name you found in your browser
  const supabaseToken = request.cookies.get(
    "sb-ozryvfkepzszmfywoszt-auth-token",
  );

  if (!supabaseToken) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/inventory/:path*", "/inventory"],
};
