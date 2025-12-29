'use client';

/**
 * Offline Support Components
 * Queue local changes when disconnected, sync on reconnection, show connection status
 * 
 * Requirements: 3.5 - Queue local changes and sync when reconnected
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { useCollaboration } from './collaboration-provider';
import type { ConnectionStatus } from '@/lib/collaboration';

export interface OfflineChange {
  id: string;
  timestamp: number;
  update: Uint8Array;
  documentId: string;
}

export interface OfflineQueueState {
  /** Number of pending changes */
  pendingCount: number;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSyncTime: number | null;
  /** Whether there was a sync error */
  syncError: string | null;
}

/**
 * Hook to manage offline change queue
 */
export function useOfflineQueue(documentId: string) {
  const { provider, connectionStatus, isOffline } = useCollaboration();
  const [queueState, setQueueState] = useState<OfflineQueueState>({
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
  });
  
  const pendingUpdatesRef = useRef<OfflineChange[]>([]);
  const wasOfflineRef = useRef(false);

  // Track updates when offline
  useEffect(() => {
    if (!provider) return;

    const doc = provider.getDocument();
    
    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      // Only queue local updates when offline
      if (isOffline && origin !== 'remote') {
        const change: OfflineChange = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          update,
          documentId,
        };
        pendingUpdatesRef.current.push(change);
        setQueueState(prev => ({
          ...prev,
          pendingCount: pendingUpdatesRef.current.length,
        }));
      }
    };

    doc.on('update', handleUpdate);

    return () => {
      doc.off('update', handleUpdate);
    };
  }, [provider, isOffline, documentId]);

  // Handle reconnection and sync
  useEffect(() => {
    if (wasOfflineRef.current && connectionStatus === 'connected') {
      // We just reconnected - Yjs handles sync automatically
      // Clear our tracking since Yjs will sync the full state
      setQueueState(prev => ({
        ...prev,
        isSyncing: true,
      }));

      // Give Yjs time to sync, then clear pending
      const syncTimeout = setTimeout(() => {
        pendingUpdatesRef.current = [];
        setQueueState({
          pendingCount: 0,
          isSyncing: false,
          lastSyncTime: Date.now(),
          syncError: null,
        });
      }, 1000);

      return () => clearTimeout(syncTimeout);
    }
    
    wasOfflineRef.current = isOffline;
  }, [connectionStatus, isOffline]);

  // Manual sync trigger (if needed)
  const triggerSync = useCallback(() => {
    if (!provider || isOffline) return;
    
    setQueueState(prev => ({ ...prev, isSyncing: true }));
    
    // Yjs handles sync automatically, but we can force a state update
    try {
      const state = provider.getEncodedState();
      // The provider will sync this state via WebSocket
      pendingUpdatesRef.current = [];
      setQueueState({
        pendingCount: 0,
        isSyncing: false,
        lastSyncTime: Date.now(),
        syncError: null,
      });
    } catch (error) {
      setQueueState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, [provider, isOffline]);

  return {
    ...queueState,
    triggerSync,
    isOffline,
  };
}


export interface ConnectionStatusBannerProps {
  /** Custom class name */
  className?: string;
  /** Whether to show pending changes count */
  showPendingCount?: boolean;
}

/**
 * Banner component showing connection status and offline state
 */
export function ConnectionStatusBanner({
  className = '',
  showPendingCount = true,
}: ConnectionStatusBannerProps) {
  const { connectionStatus, isOffline, pendingChangesCount } = useCollaboration();

  if (connectionStatus === 'connected' && pendingChangesCount === 0) {
    return null; // Don't show banner when everything is fine
  }

  const statusConfig: Record<ConnectionStatus, { bg: string; text: string; message: string }> = {
    connecting: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-800 dark:text-yellow-200',
      message: 'Connecting to server...',
    },
    connected: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-800 dark:text-blue-200',
      message: pendingChangesCount > 0 ? 'Syncing changes...' : 'Connected',
    },
    disconnected: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-800 dark:text-red-200',
      message: 'You are offline. Changes will sync when reconnected.',
    },
  };

  const config = statusConfig[connectionStatus];

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 ${config.bg} ${config.text} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <StatusIcon status={connectionStatus} />
        <span className="text-sm font-medium">{config.message}</span>
      </div>
      {showPendingCount && pendingChangesCount > 0 && (
        <span className="text-sm">
          {pendingChangesCount} pending change{pendingChangesCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: ConnectionStatus }) {
  if (status === 'connecting') {
    return (
      <svg
        className="h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }

  if (status === 'disconnected') {
    return (
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
      />
    </svg>
  );
}

export interface OfflineBadgeProps {
  /** Custom class name */
  className?: string;
}

/**
 * Small badge showing offline status
 */
export function OfflineBadge({ className = '' }: OfflineBadgeProps) {
  const { isOffline, pendingChangesCount } = useCollaboration();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-200 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      Offline
      {pendingChangesCount > 0 && (
        <span className="ml-1">({pendingChangesCount})</span>
      )}
    </div>
  );
}

/**
 * Hook to detect online/offline browser status
 */
export function useBrowserOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Sync indicator that shows when changes are being synced
 */
export function SyncIndicator() {
  const { connectionStatus, pendingChangesCount } = useCollaboration();
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
    if (connectionStatus === 'connected' && pendingChangesCount > 0) {
      setShowSyncing(true);
      const timeout = setTimeout(() => setShowSyncing(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [connectionStatus, pendingChangesCount]);

  if (!showSyncing) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <svg
        className="h-3 w-3 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      Syncing...
    </div>
  );
}
