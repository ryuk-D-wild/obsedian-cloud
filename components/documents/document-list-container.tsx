'use client';

import { useRouter } from 'next/navigation';
import { DocumentList, type DocumentSummary } from './document-list';
import { useOptimisticDocuments } from './use-optimistic-documents';
import {
  createDocument as createDocumentAction,
  updateDocument as updateDocumentAction,
  deleteDocument as deleteDocumentAction,
} from '@/lib/actions/documents';

export interface DocumentListContainerProps {
  initialDocuments: DocumentSummary[];
  workspaceId: string;
  onError?: (error: string) => void;
}

/**
 * Container component that connects DocumentList with optimistic operations.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 - Full optimistic UI implementation
 */
export function DocumentListContainer({
  initialDocuments,
  workspaceId,
  onError,
}: DocumentListContainerProps) {
  const router = useRouter();

  const {
    documents,
    isCreating,
    deletingIds,
    createDocument,
    deleteDocument,
  } = useOptimisticDocuments({
    initialDocuments,
    onCreateDocument: async () => {
      const result = await createDocumentAction({ workspaceId });
      if (result.success && result.data) {
        // Refresh the page to get the real document from server
        router.refresh();
        return {
          success: true,
          data: {
            id: result.data.id,
            title: result.data.title,
            updatedAt: result.data.updatedAt,
          },
        };
      }
      return { success: false, error: result.error };
    },
    onUpdateDocument: async (id, title) => {
      const result = await updateDocumentAction(id, { title });
      if (result.success) {
        router.refresh();
      }
      return { success: result.success, error: result.error };
    },
    onDeleteDocument: async (id) => {
      const result = await deleteDocumentAction(id);
      if (result.success) {
        router.refresh();
      }
      return { success: result.success, error: result.error };
    },
    onError,
  });

  const handleSelect = (id: string) => {
    // Navigate to document editor
    router.push(`/documents/${id}`);
  };

  return (
    <DocumentList
      documents={documents}
      onSelect={handleSelect}
      onDelete={deleteDocument}
      onCreate={createDocument}
      isCreating={isCreating}
      deletingIds={deletingIds}
    />
  );
}
