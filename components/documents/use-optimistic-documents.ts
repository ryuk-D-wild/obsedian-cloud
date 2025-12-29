'use client';

import { useOptimistic, useCallback, useState, useTransition } from 'react';
import type { DocumentSummary } from './document-list';

/**
 * Optimistic document with pending state indicator.
 * Requirements: 5.5 - Display subtle loading indicator while pending
 */
export interface OptimisticDocument extends DocumentSummary {
  isPending?: boolean;
}

type OptimisticAction =
  | { type: 'create'; document: OptimisticDocument }
  | { type: 'update'; id: string; title: string }
  | { type: 'delete'; id: string };

/**
 * Reducer for optimistic document state updates.
 * Requirements: 5.1, 5.2, 5.3 - Immediate UI updates for create, update, delete
 */
function optimisticReducer(
  state: OptimisticDocument[],
  action: OptimisticAction
): OptimisticDocument[] {
  switch (action.type) {
    case 'create':
      return [action.document, ...state];
    case 'update':
      return state.map((doc) =>
        doc.id === action.id
          ? { ...doc, title: action.title, isPending: true }
          : doc
      );
    case 'delete':
      return state.filter((doc) => doc.id !== action.id);
    default:
      return state;
  }
}

export interface UseOptimisticDocumentsOptions {
  initialDocuments: DocumentSummary[];
  onCreateDocument: () => Promise<{ success: boolean; data?: DocumentSummary; error?: string }>;
  onUpdateDocument: (id: string, title: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteDocument: (id: string) => Promise<{ success: boolean; error?: string }>;
  onError?: (error: string) => void;
}

export interface UseOptimisticDocumentsReturn {
  documents: OptimisticDocument[];
  isCreating: boolean;
  deletingIds: string[];
  createDocument: () => Promise<void>;
  updateDocument: (id: string, title: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

/**
 * Custom hook for optimistic document operations.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 - Optimistic UI with rollback on failure
 */
export function useOptimisticDocuments({
  initialDocuments,
  onCreateDocument,
  onUpdateDocument,
  onDeleteDocument,
  onError,
}: UseOptimisticDocumentsOptions): UseOptimisticDocumentsReturn {
  const [optimisticDocuments, addOptimisticAction] = useOptimistic(
    initialDocuments.map((doc) => ({ ...doc, isPending: false })),
    optimisticReducer
  );

  const [isCreating, setIsCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  /**
   * Creates a new document with optimistic UI update.
   * Requirements: 5.1 - Display new item immediately before server confirmation
   */
  const createDocument = useCallback(async () => {
    setIsCreating(true);

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticDoc: OptimisticDocument = {
      id: tempId,
      title: 'Untitled',
      updatedAt: new Date(),
      isPending: true,
    };

    startTransition(async () => {
      // Apply optimistic update
      addOptimisticAction({ type: 'create', document: optimisticDoc });

      try {
        const result = await onCreateDocument();

        if (!result.success) {
          // Rollback happens automatically when the transition completes
          // because we're using useOptimistic with the server state
          onError?.(result.error ?? 'Failed to create document');
        }
      } catch {
        onError?.('Failed to create document');
      } finally {
        setIsCreating(false);
      }
    });
  }, [onCreateDocument, onError, addOptimisticAction]);

  /**
   * Updates a document with optimistic UI update.
   * Requirements: 5.2 - Reflect changes instantly
   */
  const updateDocument = useCallback(
    async (id: string, title: string) => {
      startTransition(async () => {
        // Apply optimistic update
        addOptimisticAction({ type: 'update', id, title });

        try {
          const result = await onUpdateDocument(id, title);

          if (!result.success) {
            // Rollback happens automatically
            onError?.(result.error ?? 'Failed to update document');
          }
        } catch {
          onError?.('Failed to update document');
        }
      });
    },
    [onUpdateDocument, onError, addOptimisticAction]
  );

  /**
   * Deletes a document with optimistic UI update.
   * Requirements: 5.3 - Remove item from view immediately
   */
  const deleteDocument = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => [...prev, id]);

      startTransition(async () => {
        // Apply optimistic update
        addOptimisticAction({ type: 'delete', id });

        try {
          const result = await onDeleteDocument(id);

          if (!result.success) {
            // Rollback happens automatically
            onError?.(result.error ?? 'Failed to delete document');
          }
        } catch {
          onError?.('Failed to delete document');
        } finally {
          setDeletingIds((prev) => prev.filter((deletingId) => deletingId !== id));
        }
      });
    },
    [onDeleteDocument, onError, addOptimisticAction]
  );

  return {
    documents: optimisticDocuments,
    isCreating: isCreating || isPending,
    deletingIds,
    createDocument,
    updateDocument,
    deleteDocument,
  };
}
