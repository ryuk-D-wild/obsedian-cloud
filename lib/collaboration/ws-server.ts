/**
 * WebSocket Server for Yjs Collaboration
 * Handles document room management and real-time synchronization
 * 
 * Requirements: 3.2, 3.4
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import { IncomingMessage } from 'http';

// Presence timeout in milliseconds (5 seconds as per requirement 3.4)
const PRESENCE_TIMEOUT = 5000;

export interface DocumentRoom {
  doc: Y.Doc;
  clients: Map<string, ClientConnection>;
  lastActivity: number;
}

export interface ClientConnection {
  ws: WebSocket;
  userId: string;
  userName: string;
  userColor: string;
  lastSeen: number;
  cursor?: { x: number; y: number };
}

export interface WSMessage {
  type: 'sync' | 'update' | 'awareness' | 'join' | 'leave' | 'cursor';
  documentId: string;
  data?: Uint8Array | string;
  userId?: string;
  userName?: string;
  userColor?: string;
  cursor?: { x: number; y: number };
}

/**
 * Collaboration WebSocket Server
 * Manages document rooms and client connections
 */
export class CollaborationServer {
  private wss: WebSocketServer;
  private rooms: Map<string, DocumentRoom> = new Map();
  private clientToRoom: Map<WebSocket, string> = new Map();
  private presenceCleanupInterval: ReturnType<typeof setInterval>;

  constructor(port: number = 1234) {
    this.wss = new WebSocketServer({ port });
    this.setupServer();
    
    // Clean up stale presence every second
    this.presenceCleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, 1000);

    console.log(`Collaboration WebSocket server running on port ${port}`);
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const documentId = url.pathname.slice(1); // Remove leading slash
      const userId = url.searchParams.get('userId') || this.generateClientId();

      if (!documentId) {
        ws.close(4000, 'Document ID required');
        return;
      }

      this.handleConnection(ws, documentId, userId);
    });
  }

  private handleConnection(ws: WebSocket, documentId: string, userId: string): void {
    // Get or create room
    const room = this.getOrCreateRoom(documentId);
    
    // Create client connection
    const client: ClientConnection = {
      ws,
      userId,
      userName: 'Anonymous',
      userColor: this.generateUserColor(),
      lastSeen: Date.now(),
    };

    // Add client to room
    room.clients.set(userId, client);
    this.clientToRoom.set(ws, documentId);

    // Send initial sync
    this.sendInitialSync(ws, room);

    // Broadcast join to other clients
    this.broadcastPresence(room, userId, 'join');

    // Set up message handling
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, room, client, data);
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(ws, room, userId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      this.handleDisconnection(ws, room, userId);
    });
  }

  private getOrCreateRoom(documentId: string): DocumentRoom {
    let room = this.rooms.get(documentId);
    
    if (!room) {
      room = {
        doc: new Y.Doc(),
        clients: new Map(),
        lastActivity: Date.now(),
      };
      this.rooms.set(documentId, room);
    }

    return room;
  }

  private sendInitialSync(ws: WebSocket, room: DocumentRoom): void {
    // Send current document state
    const state = Y.encodeStateAsUpdate(room.doc);
    const message: WSMessage = {
      type: 'sync',
      documentId: '',
      data: Buffer.from(state).toString('base64'),
    };
    ws.send(JSON.stringify(message));

    // Send current presence list
    const presenceList = this.getPresenceList(room);
    ws.send(JSON.stringify({
      type: 'awareness',
      documentId: '',
      data: JSON.stringify(presenceList),
    }));
  }

  private handleMessage(
    ws: WebSocket,
    room: DocumentRoom,
    client: ClientConnection,
    data: Buffer
  ): void {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      client.lastSeen = Date.now();
      room.lastActivity = Date.now();

      switch (message.type) {
        case 'update':
          this.handleUpdate(room, client, message);
          break;
        case 'awareness':
          this.handleAwareness(room, client, message);
          break;
        case 'cursor':
          this.handleCursor(room, client, message);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private handleUpdate(room: DocumentRoom, client: ClientConnection, message: WSMessage): void {
    if (!message.data || typeof message.data !== 'string') return;

    // Decode and apply update
    const update = Buffer.from(message.data, 'base64');
    Y.applyUpdate(room.doc, new Uint8Array(update));

    // Broadcast to other clients
    room.clients.forEach((otherClient, userId) => {
      if (userId !== client.userId && otherClient.ws.readyState === WebSocket.OPEN) {
        otherClient.ws.send(JSON.stringify(message));
      }
    });
  }

  private handleAwareness(room: DocumentRoom, client: ClientConnection, message: WSMessage): void {
    if (message.userName) {
      client.userName = message.userName;
    }
    if (message.userColor) {
      client.userColor = message.userColor;
    }

    // Broadcast updated presence
    this.broadcastPresence(room, client.userId, 'awareness');
  }

  private handleCursor(room: DocumentRoom, client: ClientConnection, message: WSMessage): void {
    client.cursor = message.cursor;

    // Broadcast cursor update to other clients
    room.clients.forEach((otherClient, userId) => {
      if (userId !== client.userId && otherClient.ws.readyState === WebSocket.OPEN) {
        otherClient.ws.send(JSON.stringify({
          type: 'cursor',
          documentId: message.documentId,
          userId: client.userId,
          userName: client.userName,
          userColor: client.userColor,
          cursor: client.cursor,
        }));
      }
    });
  }

  private handleDisconnection(ws: WebSocket, room: DocumentRoom, userId: string): void {
    // Remove client from room
    room.clients.delete(userId);
    this.clientToRoom.delete(ws);

    // Broadcast leave to remaining clients
    this.broadcastPresence(room, userId, 'leave');

    // Clean up empty rooms after a delay
    if (room.clients.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(room.doc.guid);
        if (currentRoom && currentRoom.clients.size === 0) {
          currentRoom.doc.destroy();
          this.rooms.delete(room.doc.guid);
        }
      }, 60000); // Keep room for 1 minute after last client leaves
    }
  }

  private broadcastPresence(room: DocumentRoom, userId: string, action: 'join' | 'leave' | 'awareness'): void {
    const presenceList = this.getPresenceList(room);
    const message = JSON.stringify({
      type: 'awareness',
      action,
      userId,
      data: JSON.stringify(presenceList),
    });

    room.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  private getPresenceList(room: DocumentRoom): Array<{
    userId: string;
    userName: string;
    userColor: string;
    cursor?: { x: number; y: number };
  }> {
    const list: Array<{
      userId: string;
      userName: string;
      userColor: string;
      cursor?: { x: number; y: number };
    }> = [];

    room.clients.forEach((client) => {
      list.push({
        userId: client.userId,
        userName: client.userName,
        userColor: client.userColor,
        cursor: client.cursor,
      });
    });

    return list;
  }

  /**
   * Clean up clients that haven't been seen in PRESENCE_TIMEOUT ms
   * Requirement 3.4: Remove presence indicator within 5 seconds
   */
  private cleanupStalePresence(): void {
    const now = Date.now();

    this.rooms.forEach((room) => {
      room.clients.forEach((client, userId) => {
        if (now - client.lastSeen > PRESENCE_TIMEOUT) {
          // Client is stale, remove them
          client.ws.close(4001, 'Connection timeout');
          room.clients.delete(userId);
          this.clientToRoom.delete(client.ws);
          this.broadcastPresence(room, userId, 'leave');
        }
      });
    });
  }

  /**
   * Get the current state of a document room
   */
  getDocumentState(documentId: string): Uint8Array | null {
    const room = this.rooms.get(documentId);
    if (!room) return null;
    return Y.encodeStateAsUpdate(room.doc);
  }

  /**
   * Load initial state into a document room
   */
  loadDocumentState(documentId: string, state: Uint8Array): void {
    const room = this.getOrCreateRoom(documentId);
    Y.applyUpdate(room.doc, state);
  }

  /**
   * Get connected client count for a document
   */
  getClientCount(documentId: string): number {
    const room = this.rooms.get(documentId);
    return room ? room.clients.size : 0;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Gracefully shut down the server
   */
  close(): void {
    clearInterval(this.presenceCleanupInterval);
    
    // Close all client connections
    this.rooms.forEach((room) => {
      room.clients.forEach((client) => {
        client.ws.close(1001, 'Server shutting down');
      });
      room.doc.destroy();
    });

    this.rooms.clear();
    this.clientToRoom.clear();
    this.wss.close();
  }
}

// Export a function to start the server
export function startCollaborationServer(port: number = 1234): CollaborationServer {
  return new CollaborationServer(port);
}
