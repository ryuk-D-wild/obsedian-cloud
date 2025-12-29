'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentIdSchema,
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from '@/lib/validations/document';
import { z } from 'zod';

// Generic error message to prevent exposing internal details
const GENERIC_DB_ERROR = 'Operation failed. Please try again.';

export interface DocumentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: Date;
}

export interface Document {
  id: string;
  title: string;
  workspaceId: string;
  authorId: string;
  yjsState: Uint8Array | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a new document in the specified workspace.
 * Requirements: 2.1 - Create document with unique ID and default title
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<DocumentResult<Document>> {
  // Validate input
  const parsed = createDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Verify user has access to the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: parsed.data.workspaceId,
        },
      },
    });

    if (!membership) {
      return { success: false, error: 'Access denied to workspace' };
    }

    // Create the document
    const document = await prisma.document.create({
      data: {
        title: parsed.data.title ?? 'Untitled',
        workspaceId: parsed.data.workspaceId,
        authorId: session.user.id,
      },
    });

    return {
      success: true,
      data: {
        ...document,
        yjsState: document.yjsState ? new Uint8Array(document.yjsState) : null,
      },
    };
  } catch (error) {
    // Log the actual error for debugging but return generic message
    console.error('createDocument error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}


/**
 * Updates an existing document.
 * Requirements: 2.3 - Persist changes via Server Actions
 */
export async function updateDocument(
  id: string,
  input: UpdateDocumentInput
): Promise<DocumentResult<Document>> {
  // Validate document ID
  const idParsed = documentIdSchema.safeParse({ id });
  if (!idParsed.success) {
    return {
      success: false,
      error: 'Invalid document ID',
      fieldErrors: { id: ['Invalid document ID format'] },
    };
  }

  // Validate input
  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Check if document exists and user has access
    const existingDoc = await prisma.document.findUnique({
      where: { id },
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

    // Prepare update data
    const updateData: { title?: string; yjsState?: Uint8Array<ArrayBuffer> | null } = {};
    if (parsed.data.title !== undefined) {
      updateData.title = parsed.data.title;
    }
    if (parsed.data.yjsState !== undefined) {
      updateData.yjsState = new Uint8Array(parsed.data.yjsState) as Uint8Array<ArrayBuffer>;
    }

    // Update the document
    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      data: {
        ...document,
        yjsState: document.yjsState ? new Uint8Array(document.yjsState) : null,
      },
    };
  } catch (error) {
    console.error('updateDocument error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}

/**
 * Deletes a document.
 * Requirements: 2.4 - Remove document from database
 */
export async function deleteDocument(id: string): Promise<DocumentResult<void>> {
  // Validate document ID
  const idParsed = documentIdSchema.safeParse({ id });
  if (!idParsed.success) {
    return {
      success: false,
      error: 'Invalid document ID',
      fieldErrors: { id: ['Invalid document ID format'] },
    };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Check if document exists and user has access
    const existingDoc = await prisma.document.findUnique({
      where: { id },
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

    // Delete the document
    await prisma.document.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error('deleteDocument error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}


/**
 * Retrieves a single document by ID.
 * Requirements: 2.2 - Load document content
 */
export async function getDocument(id: string): Promise<DocumentResult<Document>> {
  // Validate document ID
  const idParsed = documentIdSchema.safeParse({ id });
  if (!idParsed.success) {
    return {
      success: false,
      error: 'Invalid document ID',
      fieldErrors: { id: ['Invalid document ID format'] },
    };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Fetch document with access check
    const document = await prisma.document.findUnique({
      where: { id },
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

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    if (document.workspace.members.length === 0) {
      return { success: false, error: 'Access denied' };
    }

    return {
      success: true,
      data: {
        id: document.id,
        title: document.title,
        workspaceId: document.workspaceId,
        authorId: document.authorId,
        yjsState: document.yjsState ? new Uint8Array(document.yjsState) : null,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    };
  } catch (error) {
    console.error('getDocument error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}

/**
 * Lists all documents in a workspace.
 * Requirements: 2.5 - Display all accessible documents with titles and timestamps
 */
export async function listDocuments(
  workspaceId: string
): Promise<DocumentResult<DocumentSummary[]>> {
  // Validate workspace ID
  const workspaceIdSchema = z.object({
    workspaceId: z.string().cuid('Invalid workspace ID'),
  });
  
  const parsed = workspaceIdSchema.safeParse({ workspaceId });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid workspace ID',
      fieldErrors: { workspaceId: ['Invalid workspace ID format'] },
    };
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Verify user has access to the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: parsed.data.workspaceId,
        },
      },
    });

    if (!membership) {
      return { success: false, error: 'Access denied to workspace' };
    }

    // Fetch all documents in the workspace
    const documents = await prisma.document.findMany({
      where: { workspaceId: parsed.data.workspaceId },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      success: true,
      data: documents,
    };
  } catch (error) {
    console.error('listDocuments error:', error);
    return { success: false, error: GENERIC_DB_ERROR };
  }
}
