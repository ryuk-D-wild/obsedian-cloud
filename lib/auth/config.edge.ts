import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth configuration
 * This config is used by middleware and doesn't include Prisma
 * The authorize callback is handled in the full config
 */
export const authConfigEdge: NextAuthConfig = {
  providers: [], // Providers are configured in the full config
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Public routes that don't require authentication
      const publicRoutes = ['/sign-in', '/api/auth'];
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

      if (isPublicRoute) {
        return true;
      }

      // Redirect unauthenticated users to sign-in
      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
};
