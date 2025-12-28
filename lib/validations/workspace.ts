import { z } from 'zod';

// Role enum matching Prisma schema
export const roleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

// Schema for creating a new workspace
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name must be 100 characters or less'),
});

// Schema for updating an existing workspace
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name must be 100 characters or less').optional(),
});

// Schema for workspace ID parameter
export const workspaceIdSchema = z.object({
  id: z.string().cuid('Invalid workspace ID'),
});

// Schema for adding a member to a workspace
export const addWorkspaceMemberSchema = z.object({
  workspaceId: z.string().cuid('Invalid workspace ID'),
  userId: z.string().cuid('Invalid user ID'),
  role: roleSchema.optional().default('MEMBER'),
});

// Schema for updating a workspace member's role
export const updateWorkspaceMemberSchema = z.object({
  role: roleSchema,
});

// Inferred TypeScript types from Zod schemas
export type Role = z.infer<typeof roleSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceIdInput = z.infer<typeof workspaceIdSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof updateWorkspaceMemberSchema>;
