'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { documentIdSchema } from '@/lib/validations/document';

// Generic error message to prevent exposing internal details
const GENERIC_DB_ERROR = 'Operation failed. Please try again.';

export interface CollaborationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Saves Yjs CRDT state to the database.
 * Requirements: 9.3 - Persist CRDT state to database
 */
export async function saveYjsState(
  documentId: string,
  state: Uint8Array
): Promise<CollaborationResult<void>> {
  // Validate document ID
  const idParsed = documentIdSchema.safeParse({ id: documentId });
  if (!idParsed.success) {
    return { success: false, error: 'Invalid document ID' };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Check if document exists and user has access
    const existingDoc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!existingDoc) {
      return { success: false, error: 'Document not found' };
    }

    if (existingDoc.workspace.members.length === 0) {
      return { success: false, error: 'Access denied' };
    }

    // Save the Yjs state
    await prisma.document.update({
      where: { id: documentId },
      data: {
        yjsState: Buffer.from(state),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('saveYjsState error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}

/**
 * Retrieves Yjs CRDT state from the database.
 * Requirements: 9.3 - Load initial state from database on document open
 */
export async function getYjsState(
  documentId: string
): Promise<CollaborationResult<Uint8Array | null>> {
  // Validate document ID
  const idParsed = documentIdSchema.safeParse({ id: documentId });
  if (!idParsed.success) {
    return { success: false, error: 'Invalid document ID' };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Fetch document with access check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        yjsState: true,
        workspace: {
          select: {
            members: {
              where: { userId: session.user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    if (document.workspace.members.length === 0) {
      return { success: false, error: 'Access denied' };
    }

    return {
      success: true,
      data: document.yjsState ? new Uint8Array(document.yjsState) : null,
    };
  } catch (error) {
    console.error('getYjsState error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}

// Snapshot interval in milliseconds (30 seconds)
const SNAPSHOT_INTERVAL = 30000;

// Track last snapshot times per document
const lastSnapshotTimes = new Map<string, number>();

/**
 * Saves Yjs state with periodic snapshot logic.
 * Only saves if enough time has passed since the last snapshot.
 * Requirements: 9.3 - Implement periodic state snapshots
 */
export async function saveYjsStateWithSnapshot(
  documentId: string,
  state: Uint8Array,
  force: boolean = false
): Promise<CollaborationResult<{ saved: boolean }>> {
  const now = Date.now();
  const lastSnapshot = lastSnapshotTimes.get(documentId) || 0;
  
  // Check if we should save (either forced or interval has passed)
  if (!force && now - lastSnapshot < SNAPSHOT_INTERVAL) {
    return { success: true, data: { saved: false } };
  }

  // Save the state
  const result = await saveYjsState(documentId, state);
  
  if (result.success) {
    lastSnapshotTimes.set(documentId, now);
    return { success: true, data: { saved: true } };
  }

  return { success: false, error: result.error };
}

/**
 * Loads initial Yjs state and returns it for document initialization.
 * Requirements: 9.3 - Load initial state from database on document open
 */
export async function loadDocumentState(
  documentId: string
): Promise<CollaborationResult<{
  state: Uint8Array | null;
  title: string;
  workspaceId: string;
}>> {
  // Validate document ID
  const idParsed = documentIdSchema.safeParse({ id: documentId });
  if (!idParsed.success) {
    return { success: false, error: 'Invalid document ID' };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Fetch document with access check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        title: true,
        workspaceId: true,
        yjsState: true,
        workspace: {
          select: {
            members: {
              where: { userId: session.user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    if (document.workspace.members.length === 0) {
      return { success: false, error: 'Access denied' };
    }

    return {
      success: true,
      data: {
        state: document.yjsState ? new Uint8Array(document.yjsState) : null,
        title: document.title,
        workspaceId: document.workspaceId,
      },
    };
  } catch (error) {
    console.error('loadDocumentState error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}
