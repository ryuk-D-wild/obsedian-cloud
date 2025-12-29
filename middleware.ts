import NextAuth from 'next-auth';
import { authConfigEdge } from '@/lib/auth/config.edge';
import { NextResponse } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/sign-in', '/sign-up', '/api/auth', '/'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/sign-in', '/sign-up'];

const { auth } = NextAuth(authConfigEdge);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  // Check if the current route is an auth route (sign-in, etc.)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // If route is public, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If user is not logged in and trying to access protected route, redirect to sign-in
  if (!isLoggedIn) {
    const signInUrl = new URL('/sign-in', nextUrl);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
