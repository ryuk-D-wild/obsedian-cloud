'use client';

/**
 * Dashboard Client Component
 * Handles document management with real database operations and offline support
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { DocumentEditor } from '@/components/editor';
import { CollaborationProvider } from '@/components/collaboration';
import { DocumentList, type DocumentSummary } from '@/components/documents/document-list';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { ThemeToggle } from '@/components/theme';
import { Button } from '@/components/ui/button';
import { EditorSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toaster';
import { FileText, Menu, X, Check, Loader2 } from 'lucide-react';
import {
  createDocument,
  deleteDocument,
  updateDocument,
  getDocument,
} from '@/lib/actions/documents';

type SaveStatus = 'saved' | 'unsaved' | 'saving';

interface DashboardClientProps {
  initialDocuments: DocumentSummary[];
  workspaceId: string;
  userId: string;
  userName: string;
}

export function DashboardClient({ 
  initialDocuments, 
  workspaceId,
  userId,
  userName
}: DashboardClientProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [documentContent, setDocumentContent] = useState<string>('');
  const [yjsInitialState, setYjsInitialState] = useState<Uint8Array | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const { addToast } = useToast();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<Uint8Array | null>(null);
  const isSavingRef = useRef(false);
  const offlineQueueRef = useRef<Array<{ documentId: string; state: Uint8Array }>>([]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineQueueRef.current.length > 0) {
        addToast({
          title: 'Back online',
          description: 'Syncing your changes...',
          variant: 'default',
        });
        processOfflineQueue();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addToast({
        title: 'You\'re offline',
        description: 'Your changes will be saved locally.',
        variant: 'default',
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    const queue = [...offlineQueueRef.current];
    offlineQueueRef.current = [];
    
    for (const item of queue) {
      try {
        await updateDocument(item.documentId, { 
          yjsState: new Uint8Array(item.state) as Uint8Array<ArrayBuffer>
        });
      } catch (error) {
        console.warn('Failed to sync:', error);
        offlineQueueRef.current.push(item);
      }
    }
    
    if (offlineQueueRef.current.length === 0) {
      addToast({
        title: 'Synced',
        description: 'All changes saved.',
        variant: 'success',
      });
    }
  }, [addToast]);

  // Helper to compare arrays
  const arraysEqual = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const handleContentUpdate = useCallback((content: string, yjsUpdate?: Uint8Array) => {
    setDocumentContent(content);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!selectedDocumentId || isSavingRef.current) return;
      
      const stateToSave = yjsUpdate || new TextEncoder().encode(content);
      
      if (lastSavedStateRef.current && arraysEqual(lastSavedStateRef.current, stateToSave)) {
        return;
      }
      
      if (!isOnline) {
        offlineQueueRef.current.push({ documentId: selectedDocumentId, state: stateToSave });
        setSaveStatus('saved');
        return;
      }
      
      isSavingRef.current = true;
      setSaveStatus('saving');
      
      try {
        const result = await updateDocument(selectedDocumentId, { 
          yjsState: new Uint8Array(stateToSave) as Uint8Array<ArrayBuffer>
        });
        
        if (result.success) {
          lastSavedStateRef.current = stateToSave;
          setSaveStatus('saved');
        } else {
          setSaveStatus('unsaved');
          console.warn('Auto-save failed:', result.error);
        }
      } catch (error) {
        setSaveStatus('unsaved');
        console.warn('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 3000);
  }, [selectedDocumentId, isOnline]);

  const handleYjsUpdate = useCallback((yjsState: Uint8Array) => {
    handleContentUpdate('', yjsState);
  }, [handleContentUpdate]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleCreateDocument = useCallback(async () => {
    setIsCreating(true);
    
    try {
      const result = await createDocument({ workspaceId });
      
      if (result.success && result.data) {
        const newDoc: DocumentSummary = {
          id: result.data.id,
          title: result.data.title,
          updatedAt: result.data.updatedAt,
        };
        setDocuments(prev => [newDoc, ...prev]);
        setSelectedDocumentId(newDoc.id);
        setDocumentContent('');
        setYjsInitialState(null);
        lastSavedStateRef.current = null;
        setSaveStatus('saved');
        addToast({
          title: 'Document created',
          description: 'Your new document is ready.',
          variant: 'success',
        });
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to create document',
          variant: 'error',
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to create document',
        variant: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  }, [workspaceId, addToast]);

  const handleDeleteDocument = useCallback(async (id: string) => {
    setDeletingIds(prev => [...prev, id]);
    
    try {
      const result = await deleteDocument(id);
      
      if (result.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        if (selectedDocumentId === id) {
          setSelectedDocumentId(null);
        }
        addToast({
          title: 'Document deleted',
          description: 'The document has been removed.',
          variant: 'default',
        });
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to delete document',
          variant: 'error',
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'error',
      });
    } finally {
      setDeletingIds(prev => prev.filter(delId => delId !== id));
    }
  }, [selectedDocumentId, addToast]);

  const handleSelectDocument = useCallback(async (id: string) => {
    if (selectedDocumentId && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    setIsLoadingDocument(true);
    setSelectedDocumentId(id);
    setSaveStatus('saved');
    lastSavedStateRef.current = null;
    
    try {
      const result = await getDocument(id);
      
      if (result.success && result.data?.yjsState) {
        const content = new TextDecoder().decode(result.data.yjsState);
        setDocumentContent(content);
        setYjsInitialState(result.data.yjsState);
        lastSavedStateRef.current = result.data.yjsState;
      } else {
        setDocumentContent('');
        setYjsInitialState(null);
        lastSavedStateRef.current = null;
      }
    } catch {
      setDocumentContent('');
      setYjsInitialState(null);
      lastSavedStateRef.current = null;
    }
    
    setTimeout(() => setIsLoadingDocument(false), 300);
  }, [selectedDocumentId]);

  const handleRenameDocument = useCallback(async (id: string, newTitle: string) => {
    try {
      const result = await updateDocument(id, { title: newTitle });
      
      if (result.success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === id ? { ...doc, title: newTitle, updatedAt: new Date() } : doc
        ));
        addToast({
          title: 'Document renamed',
          description: 'The document title has been updated.',
          variant: 'success',
        });
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to rename document',
          variant: 'error',
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to rename document',
        variant: 'error',
      });
    }
  }, [addToast]);

  const selectedDocument = documents.find(d => d.id === selectedDocumentId);

  return (
    <div className="flex h-screen bg-background">
      <aside 
        className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 border-r border-border bg-muted/30 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-lg">Obsidian Cloud</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <DocumentList
            documents={documents}
            onSelect={handleSelectDocument}
            onDelete={handleDeleteDocument}
            onRename={handleRenameDocument}
            onCreate={handleCreateDocument}
            isCreating={isCreating}
            deletingIds={deletingIds}
          />
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{userName}</span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 shrink-0">
          {!sidebarOpen && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
          
          {selectedDocument ? (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{selectedDocument.title}</span>
              <div className="flex items-center gap-1 ml-2 text-sm text-muted-foreground">
                {!isOnline && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-yellow-500">Offline</span>
                    <span className="mx-1">•</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Saved</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <span className="text-yellow-500">Editing...</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Select or create a document</span>
          )}

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {selectedDocumentId ? (
            isLoadingDocument ? (
              <EditorSkeleton />
            ) : (
              <CollaborationProvider
                documentId={selectedDocumentId}
                userId={userId}
                userName={userName}
                initialState={yjsInitialState}
                onUpdate={handleYjsUpdate}
              >
                <div className="max-w-4xl mx-auto p-8">
                  <DocumentEditor
                    key={selectedDocumentId}
                    documentId={selectedDocumentId}
                    userId={userId}
                    userName={userName}
                    initialContent={documentContent}
                    placeholder="Start typing or press '/' for commands..."
                    onUpdate={handleContentUpdate}
                  />
                </div>
              </CollaborationProvider>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No document selected</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Select a document from the sidebar or create a new one to get started.
              </p>
              <Button onClick={handleCreateDocument} disabled={isCreating} className="bg-black text-white hover:bg-gray-800">
                Create New Document
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
