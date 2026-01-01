import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardClient } from './dashboard-client';

/**
 * Dashboard Page - Server Component
 * Fetches user's documents from database and renders the dashboard
 */
export default async function DashboardPage() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.log('[Dashboard] No session found, redirecting to sign-in');
      redirect('/sign-in');
    }

    console.log('[Dashboard] Session user ID:', session.user.id);

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!dbUser) {
      console.log('[Dashboard] User not in database, clearing session and redirecting');
      // Clear invalid session and redirect to sign-in
      await signOut({ redirect: false });
      redirect('/sign-in');
    }

    console.log('[Dashboard] User verified in database:', dbUser.email);

    // Get user's first workspace (or create one if none exists)
    let workspace = await prisma.workspace.findFirst({
      where: {
        members: {
          some: { userId: session.user.id }
        }
      },
      include: {
        documents: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    console.log('[Dashboard] Workspace found:', workspace?.id || 'none');

    // Create default workspace if user has none
    if (!workspace) {
      console.log('[Dashboard] Creating default workspace for user:', session.user.id);

      try {
        workspace = await prisma.workspace.create({
          data: {
            name: 'My Workspace',
            members: {
              create: {
                userId: session.user.id,
                role: 'OWNER',
              },
            },
          },
          include: {
            documents: {
              select: {
                id: true,
                title: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: 'desc' },
            },
          },
        });
        console.log('[Dashboard] Created workspace:', workspace.id);
      } catch (createError) {
        console.error('[Dashboard] Failed to create workspace:', createError);
        throw createError;
      }
    }

    return (
      <DashboardClient
        initialDocuments={workspace.documents}
        workspaceId={workspace.id}
        userId={session.user.id}
        userName={session.user.name || 'User'}
      />
    );
  } catch (error) {
    console.error('[Dashboard] Error:', error);

    // If it's a redirect, let it through
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }

    // For other errors, show them
    throw error;
  }
}
