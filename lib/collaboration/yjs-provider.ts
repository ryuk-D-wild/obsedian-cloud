/**
 * Yjs WebSocket Provider for real-time collaboration
 * Manages document binding and WebSocket connection for CRDT synchronization
 * 
 * Requirements: 3.1, 3.2
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface YjsProviderConfig {
  documentId: string;
  serverUrl: string;
  userId: string;
  userName?: string;
  userColor?: string;
}

export interface CollaboratorInfo {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

export interface YjsProviderState {
  isConnected: boolean;
  isSynced: boolean;
  collaborators: CollaboratorInfo[];
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface YjsProviderEvents {
  onStatusChange?: (status: ConnectionStatus) => void;
  onSynced?: (isSynced: boolean) => void;
  onAwarenessChange?: (collaborators: CollaboratorInfo[]) => void;
  onUpdate?: (update: Uint8Array) => void;
}

/**
 * Creates and manages a Yjs document with WebSocket synchronization
 */
export class YjsDocumentProvider {
  private ydoc: Y.Doc;
  private wsProvider: WebsocketProvider | null = null;
  private config: YjsProviderConfig;
  private events: YjsProviderEvents;
  private state: YjsProviderState;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: YjsProviderConfig, events: YjsProviderEvents = {}) {
    this.config = config;
    this.events = events;
    this.ydoc = new Y.Doc();
    this.state = {
      isConnected: false,
      isSynced: false,
      collaborators: [],
    };
  }

  /**
   * Connect to the WebSocket server and start synchronization
   */
  connect(): void {
    if (this.wsProvider) {
      return; // Already connected
    }

    this.events.onStatusChange?.('connecting');

    try {
      this.wsProvider = new WebsocketProvider(
        this.config.serverUrl,
        this.config.documentId,
        this.ydoc,
        {
          connect: true,
          params: {
            userId: this.config.userId,
          },
        }
      );

      this.setupEventListeners();
      this.setupAwareness();
    } catch (error) {
      console.warn('Failed to create WebSocket provider:', error);
      this.events.onStatusChange?.('disconnected');
    }
  }

  /**
   * Set up WebSocket provider event listeners
   */
  private setupEventListeners(): void {
    if (!this.wsProvider) return;

    this.wsProvider.on('status', (event: { status: string }) => {
      const status = event.status as ConnectionStatus;
      this.state.isConnected = status === 'connected';
      this.events.onStatusChange?.(status);

      if (status === 'connected') {
        this.reconnectAttempts = 0;
      } else if (status === 'disconnected') {
        this.handleDisconnect();
      }
    });

    this.wsProvider.on('sync', (isSynced: boolean) => {
      this.state.isSynced = isSynced;
      this.events.onSynced?.(isSynced);
    });

    // Listen for document updates
    this.ydoc.on('update', (update: Uint8Array) => {
      this.events.onUpdate?.(update);
    });
  }

  /**
   * Set up awareness protocol for presence indicators
   */
  private setupAwareness(): void {
    if (!this.wsProvider) return;

    try {
      const awareness = this.wsProvider.awareness;
      if (!awareness) {
        console.warn('Awareness not available on WebSocket provider');
        return;
      }

      // Set local user state
      awareness.setLocalState({
        user: {
          id: this.config.userId,
          name: this.config.userName || 'Anonymous',
          color: this.config.userColor || this.generateUserColor(),
        },
      });

      // Listen for awareness changes
      awareness.on('change', () => {
        const collaborators = this.getCollaborators();
        this.state.collaborators = collaborators;
        this.events.onAwarenessChange?.(collaborators);
      });
    } catch (error) {
      console.warn('Failed to setup awareness:', error);
    }
  }

  /**
   * Handle disconnection with exponential backoff reconnection
   */
  private handleDisconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (this.wsProvider && !this.state.isConnected) {
        this.wsProvider.connect();
      }
    }, delay);
  }

  /**
   * Get list of currently connected collaborators
   */
  getCollaborators(): CollaboratorInfo[] {
    if (!this.wsProvider) return [];

    const awareness = this.wsProvider.awareness;
    const states = awareness.getStates();
    const collaborators: CollaboratorInfo[] = [];

    states.forEach((state, clientId) => {
      // Skip local user
      if (clientId === awareness.clientID) return;

      if (state.user) {
        collaborators.push({
          id: state.user.id || String(clientId),
          name: state.user.name || 'Anonymous',
          color: state.user.color || '#888888',
          cursor: state.cursor,
        });
      }
    });

    return collaborators;
  }

  /**
   * Update local cursor position for presence
   */
  updateCursor(position: { x: number; y: number } | null): void {
    if (!this.wsProvider) return;

    const awareness = this.wsProvider.awareness;
    const currentState = awareness.getLocalState() || {};

    awareness.setLocalState({
      ...currentState,
      cursor: position,
    });
  }

  /**
   * Get the WebSocket provider for direct access (e.g., for CollaborationCursor)
   */
  getWebsocketProvider(): WebsocketProvider | null {
    return this.wsProvider;
  }

  /**
   * Get the Yjs document for binding to editor
   */
  getDocument(): Y.Doc {
    return this.ydoc;
  }

  /**
   * Get the text content type for rich text editing
   */
  getText(name = 'content'): Y.Text {
    return this.ydoc.getText(name);
  }

  /**
   * Get the XML fragment for ProseMirror/TipTap binding
   */
  getXmlFragment(name = 'prosemirror'): Y.XmlFragment {
    return this.ydoc.getXmlFragment(name);
  }

  /**
   * Get current provider state
   */
  getState(): YjsProviderState {
    return { ...this.state };
  }

  /**
   * Get the encoded document state for persistence
   */
  getEncodedState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  /**
   * Apply an encoded state update to the document
   */
  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.ydoc, update);
  }

  /**
   * Load initial state from database
   */
  loadInitialState(state: Uint8Array): void {
    Y.applyUpdate(this.ydoc, state);
  }

  /**
   * Generate a random color for user presence
   */
  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Disconnect and clean up resources
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.wsProvider) {
      this.wsProvider.disconnect();
      this.wsProvider.destroy();
      this.wsProvider = null;
    }

    this.state.isConnected = false;
    this.state.isSynced = false;
    this.state.collaborators = [];
  }

  /**
   * Destroy the provider and document
   */
  destroy(): void {
    this.disconnect();
    this.ydoc.destroy();
  }
}

/**
 * Factory function to create a Yjs provider instance
 */
export function createYjsProvider(
  config: YjsProviderConfig,
  events?: YjsProviderEvents
): YjsDocumentProvider {
  return new YjsDocumentProvider(config, events);
}

/**
 * Merge two Yjs document states
 * Used for conflict resolution and offline sync
 */
export function mergeYjsStates(state1: Uint8Array, state2: Uint8Array): Uint8Array {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state1);
  Y.applyUpdate(doc, state2);
  const mergedState = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return mergedState;
}

/**
 * Check if two Yjs states are equivalent
 */
export function areStatesEqual(state1: Uint8Array, state2: Uint8Array): boolean {
  const doc1 = new Y.Doc();
  const doc2 = new Y.Doc();
  
  Y.applyUpdate(doc1, state1);
  Y.applyUpdate(doc2, state2);
  
  const snapshot1 = Y.encodeStateAsUpdate(doc1);
  const snapshot2 = Y.encodeStateAsUpdate(doc2);
  
  doc1.destroy();
  doc2.destroy();
  
  // Compare the encoded states
  if (snapshot1.length !== snapshot2.length) return false;
  for (let i = 0; i < snapshot1.length; i++) {
    if (snapshot1[i] !== snapshot2[i]) return false;
  }
  return true;
}
