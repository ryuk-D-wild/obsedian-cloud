/**
 * Collaboration module exports
 * Real-time collaboration infrastructure using Yjs CRDTs
 */

export {
  YjsDocumentProvider,
  createYjsProvider,
  mergeYjsStates,
  areStatesEqual,
  type YjsProviderConfig,
  type YjsProviderState,
  type YjsProviderEvents,
  type CollaboratorInfo,
  type ConnectionStatus,
} from './yjs-provider';

export {
  CollaborationServer,
  startCollaborationServer,
  type DocumentRoom,
  type ClientConnection,
  type WSMessage,
} from './ws-server';
