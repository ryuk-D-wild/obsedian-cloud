import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardClient } from './dashboard-client';

/**
 * Dashboard Page - Server Component
 * Fetches user's documents from database and renders the dashboard
 */
export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

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

  // Create default workspace if user has none
  if (!workspace) {
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
  }

  return (
    <DashboardClient
      initialDocuments={workspace.documents}
      workspaceId={workspace.id}
      userId={session.user.id}
      userName={session.user.name || 'User'}
    />
  );
}
