/**
 * Collaboration UI components exports
 */

export {
  CollaborationProvider,
  useCollaboration,
  useCollaborators,
  useConnectionStatus,
  useIsOffline,
  type CollaborationContextValue,
  type CollaborationProviderProps,
} from './collaboration-provider';

export {
  PresenceIndicators,
  PresenceAvatar,
  PresenceAvatarStack,
  ConnectionStatusIndicator,
  CursorOverlay,
  RemoteCursors,
  type PresenceIndicatorsProps,
  type PresenceAvatarProps,
} from './presence-indicators';

export {
  useOfflineQueue,
  useBrowserOnlineStatus,
  ConnectionStatusBanner,
  OfflineBadge,
  SyncIndicator,
  type OfflineChange,
  type OfflineQueueState,
  type ConnectionStatusBannerProps,
  type OfflineBadgeProps,
} from './offline-support';
