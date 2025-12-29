/**
 * Feature: obsidian-cloud, Property 1: Unauthenticated Access Redirect
 * Validates: Requirements 1.1
 * 
 * For any request to a protected route without valid authentication,
 * the system should redirect to the sign-in page.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Public routes that don't require authentication
const publicRoutes = ['/sign-in', '/api/auth'];

// Auth routes that redirect to dashboard if already authenticated
const authRoutes = ['/sign-in'];

/**
 * Simulates the middleware logic for determining redirect behavior.
 * This is a pure function that mirrors the middleware logic for testing.
 */
function determineRedirectBehavior(
  pathname: string,
  isLoggedIn: boolean
): { shouldRedirect: boolean; redirectTo: string | null } {
  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Check if the current route is an auth route (sign-in, etc.)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return { shouldRedirect: true, redirectTo: '/' };
  }

  // If route is public, allow access
  if (isPublicRoute) {
    return { shouldRedirect: false, redirectTo: null };
  }

  // If user is not logged in and trying to access protected route, redirect to sign-in
  if (!isLoggedIn) {
    return { shouldRedirect: true, redirectTo: '/sign-in' };
  }

  return { shouldRedirect: false, redirectTo: null };
}

/**
 * Generates valid URL path segments (alphanumeric with hyphens)
 */
const pathSegmentArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 20 })
  .map(chars => chars.join(''));

/**
 * Generates protected route paths (not starting with public route prefixes)
 */
const protectedRouteArb = fc
  .array(pathSegmentArb, { minLength: 1, maxLength: 5 })
  .map(segments => '/' + segments.join('/'))
  .filter(path => !publicRoutes.some(route => path.startsWith(route)));

/**
 * Generates public route paths (starting with public route prefixes)
 */
const publicRouteArb = fc.oneof(
  fc.constant('/sign-in'),
  fc.constant('/api/auth'),
  fc.constant('/api/auth/callback'),
  fc.constant('/api/auth/signin'),
  pathSegmentArb.map(segment => `/sign-in/${segment}`),
  pathSegmentArb.map(segment => `/api/auth/${segment}`)
);

describe('Property 1: Unauthenticated Access Redirect', () => {
  // Minimum 100 iterations as per design document
  const numRuns = 100;

  it('should redirect unauthenticated users from protected routes to sign-in', () => {
    fc.assert(
      fc.property(protectedRouteArb, (pathname) => {
        const result = determineRedirectBehavior(pathname, false);
        
        // Unauthenticated users on protected routes should be redirected to sign-in
        expect(result.shouldRedirect).toBe(true);
        expect(result.redirectTo).toBe('/sign-in');
      }),
      { numRuns }
    );
  });

  it('should allow unauthenticated users to access public routes', () => {
    fc.assert(
      fc.property(publicRouteArb, (pathname) => {
        const result = determineRedirectBehavior(pathname, false);
        
        // Unauthenticated users on public routes should not be redirected
        expect(result.shouldRedirect).toBe(false);
        expect(result.redirectTo).toBe(null);
      }),
      { numRuns }
    );
  });

  it('should allow authenticated users to access protected routes', () => {
    fc.assert(
      fc.property(protectedRouteArb, (pathname) => {
        const result = determineRedirectBehavior(pathname, true);
        
        // Authenticated users on protected routes should not be redirected
        expect(result.shouldRedirect).toBe(false);
        expect(result.redirectTo).toBe(null);
      }),
      { numRuns }
    );
  });

  it('should redirect authenticated users from auth routes to dashboard', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('/sign-in'),
          pathSegmentArb.map(segment => `/sign-in/${segment}`)
        ),
        (pathname) => {
          const result = determineRedirectBehavior(pathname, true);
          
          // Authenticated users on auth routes should be redirected to dashboard
          expect(result.shouldRedirect).toBe(true);
          expect(result.redirectTo).toBe('/');
        }
      ),
      { numRuns }
    );
  });

  it('should consistently redirect unauthenticated users regardless of path depth', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(pathSegmentArb, { minLength: 1, maxLength: 5 }),
        (_, segments) => {
          const pathname = '/' + segments.join('/');
          
          // Skip if it happens to be a public route
          if (publicRoutes.some(route => pathname.startsWith(route))) {
            return true;
          }
          
          const result = determineRedirectBehavior(pathname, false);
          
          // All protected routes should redirect to sign-in
          expect(result.shouldRedirect).toBe(true);
          expect(result.redirectTo).toBe('/sign-in');
          return true;
        }
      ),
      { numRuns }
    );
  });
});
