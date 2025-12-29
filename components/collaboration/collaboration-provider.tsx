'use client';

/**
 * CollaborationProvider Component
 * Manages Yjs document lifecycle and awareness (cursor positions, user presence)
 * 
 * Requirements: 3.3 - Display presence indicators for all active collaborators
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  YjsDocumentProvider,
  createYjsProvider,
  type CollaboratorInfo,
  type ConnectionStatus,
  type YjsProviderConfig,
} from '@/lib/collaboration';

export interface CollaborationContextValue {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Whether the document is synced with server */
  isSynced: boolean;
  /** List of currently connected collaborators */
  collaborators: CollaboratorInfo[];
  /** The Yjs document provider instance */
  provider: YjsDocumentProvider | null;
  /** Update local cursor position */
  updateCursor: (position: { x: number; y: number } | null) => void;
  /** Whether we're currently offline */
  isOffline: boolean;
  /** Number of pending offline changes */
  pendingChangesCount: number;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

export interface CollaborationProviderProps {
  /** Document ID to collaborate on */
  documentId: string;
  /** WebSocket server URL */
  serverUrl?: string;
  /** Current user ID */
  userId: string;
  /** Current user display name */
  userName?: string;
  /** User's assigned color for presence */
  userColor?: string;
  /** Initial Yjs state to load */
  initialState?: Uint8Array | null;
  /** Callback when document syncs */
  onSync?: (state: Uint8Array) => void;
  /** Callback when document updates */
  onUpdate?: (state: Uint8Array) => void;
  /** Callback when awareness changes */
  onAwarenessChange?: (collaborators: CollaboratorInfo[]) => void;
  /** Callback when connection status changes */
  onConnectionChange?: (status: ConnectionStatus) => void;
  children: ReactNode;
}


const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234';

/**
 * Provider component that manages Yjs document lifecycle and collaboration state
 */
export function CollaborationProvider({
  documentId,
  serverUrl = DEFAULT_WS_URL,
  userId,
  userName,
  userColor,
  initialState,
  onSync,
  onUpdate,
  onAwarenessChange,
  onConnectionChange,
  children,
}: CollaborationProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isSynced, setIsSynced] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [provider, setProvider] = useState<YjsDocumentProvider | null>(null);
  
  const pendingUpdatesRef = useRef<Uint8Array[]>([]);
  const providerRef = useRef<YjsDocumentProvider | null>(null);

  // Sync pending changes when reconnected - inline function to avoid dependency issues
  const clearPendingChanges = useCallback(() => {
    // Yjs handles this automatically through its sync protocol
    // Clear our tracking since Yjs will sync the full state
    pendingUpdatesRef.current = [];
    setPendingChangesCount(0);
  }, []);

  // Initialize provider
  useEffect(() => {
    const config: YjsProviderConfig = {
      documentId,
      serverUrl,
      userId,
      userName,
      userColor,
    };

    let yjsProvider: YjsDocumentProvider | null = null;

    try {
      yjsProvider = createYjsProvider(config, {
        onStatusChange: (status) => {
          setConnectionStatus(status);
          setIsOffline(status === 'disconnected');
          onConnectionChange?.(status);

          // When reconnected, sync pending changes
          if (status === 'connected' && pendingUpdatesRef.current.length > 0) {
            clearPendingChanges();
          }
        },
        onSynced: (synced) => {
          setIsSynced(synced);
          if (synced && yjsProvider) {
            onSync?.(yjsProvider.getEncodedState());
          }
        },
        onAwarenessChange: (users) => {
          setCollaborators(users);
          onAwarenessChange?.(users);
        },
        onUpdate: (update) => {
          // Track updates when offline for later sync
          if (!providerRef.current?.getState().isConnected) {
            pendingUpdatesRef.current.push(update);
            setPendingChangesCount(pendingUpdatesRef.current.length);
          }
          // Notify parent component of updates for persistence
          if (yjsProvider) {
            onUpdate?.(yjsProvider.getEncodedState());
          }
        },
      });

      // Load initial state if provided
      if (initialState) {
        yjsProvider.loadInitialState(initialState);
      }

      // Connect to WebSocket server
      yjsProvider.connect();

      providerRef.current = yjsProvider;
      setProvider(yjsProvider);
    } catch (error) {
      console.warn('Failed to initialize collaboration provider:', error);
      setConnectionStatus('disconnected');
      setIsOffline(true);
    }

    return () => {
      if (yjsProvider) {
        yjsProvider.destroy();
      }
      providerRef.current = null;
    };
  }, [documentId, serverUrl, userId, userName, userColor, initialState, onSync, onUpdate, onAwarenessChange, onConnectionChange, clearPendingChanges]);

  // Update cursor position
  const updateCursor = useCallback((position: { x: number; y: number } | null) => {
    providerRef.current?.updateCursor(position);
  }, []);

  const contextValue: CollaborationContextValue = {
    connectionStatus,
    isSynced,
    collaborators,
    provider,
    updateCursor,
    isOffline,
    pendingChangesCount,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

/**
 * Hook to access collaboration context
 * @throws Error if used outside of CollaborationProvider
 */
export function useCollaboration(): CollaborationContextValue {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}

/**
 * Hook to get current collaborators
 */
export function useCollaborators(): CollaboratorInfo[] {
  const { collaborators } = useCollaboration();
  return collaborators;
}

/**
 * Hook to get connection status
 */
export function useConnectionStatus(): ConnectionStatus {
  const { connectionStatus } = useCollaboration();
  return connectionStatus;
}

/**
 * Hook to check if currently offline
 */
export function useIsOffline(): boolean {
  const { isOffline } = useCollaboration();
  return isOffline;
}
