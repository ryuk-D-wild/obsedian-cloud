/**
 * Startup script for the Collaboration WebSocket Server
 * Run with: npx tsx scripts/start-ws-server.ts
 */

import { startCollaborationServer } from '../lib/collaboration/ws-server';

const PORT = parseInt(process.env.WS_PORT || '1234', 10);

const server = startCollaborationServer(PORT);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down collaboration server...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down collaboration server...');
  server.close();
  process.exit(0);
});

console.log(`Collaboration WebSocket server started on port ${PORT}`);
