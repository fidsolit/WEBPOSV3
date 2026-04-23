import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of routes to protect
const protectedRoutes = ['/pos'];

export function middleware(request: NextRequest) {
	// Check if the current path is protected
	const { pathname } = request.nextUrl;
	const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
	if (!isProtected) return NextResponse.next();

	// Supabase session cookie (adjust name if needed)
	const supabaseToken = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token');
	if (!supabaseToken) {
		const loginUrl = new URL('/auth/login', request.url);
		return NextResponse.redirect(loginUrl);
		console.log('No Supabase session found. Redirecting to login.');
	}
	return NextResponse.next();
}

export const config = {
	matcher: ['/pos/:path*'],
};
