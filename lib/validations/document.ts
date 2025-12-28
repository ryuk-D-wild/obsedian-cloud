import { z } from 'zod';

// Schema for creating a new document
export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less').optional(),
  workspaceId: z.string().cuid('Invalid workspace ID'),
});

// Schema for updating an existing document
export const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less').optional(),
  yjsState: z.instanceof(Uint8Array).optional(),
});

// Schema for document ID parameter
export const documentIdSchema = z.object({
  id: z.string().cuid('Invalid document ID'),
});

// Inferred TypeScript types from Zod schemas
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentIdInput = z.infer<typeof documentIdSchema>;
