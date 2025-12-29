'use client';

/**
 * Presence Indicators Component
 * Shows connected users with avatars/colors and cursor positions
 * Removes presence on disconnect (5 second timeout)
 * 
 * Requirements: 3.3, 3.4
 */

import { useEffect, useState, useRef } from 'react';
import { useCollaboration } from './collaboration-provider';
import type { CollaboratorInfo, ConnectionStatus } from '@/lib/collaboration';

export interface PresenceAvatarProps {
  /** Collaborator information */
  collaborator: CollaboratorInfo;
  /** Size of the avatar in pixels */
  size?: number;
  /** Whether to show the name tooltip */
  showTooltip?: boolean;
}

/**
 * Single presence avatar for a collaborator
 */
export function PresenceAvatar({
  collaborator,
  size = 32,
  showTooltip = true,
}: PresenceAvatarProps) {
  const initials = getInitials(collaborator.name);
  
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full font-medium text-white transition-transform hover:scale-110"
      style={{
        width: size,
        height: size,
        backgroundColor: collaborator.color,
        fontSize: size * 0.4,
      }}
      title={showTooltip ? collaborator.name : undefined}
      aria-label={`${collaborator.name} is collaborating`}
    >
      {initials}
      {/* Online indicator dot */}
      <span
        className="absolute bottom-0 right-0 block rounded-full bg-green-500 ring-2 ring-white"
        style={{
          width: size * 0.3,
          height: size * 0.3,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export interface PresenceAvatarStackProps {
  /** List of collaborators to display */
  collaborators: CollaboratorInfo[];
  /** Maximum number of avatars to show before "+N" */
  maxVisible?: number;
  /** Size of each avatar */
  size?: number;
}


/**
 * Stack of presence avatars with overflow indicator
 */
export function PresenceAvatarStack({
  collaborators,
  maxVisible = 4,
  size = 32,
}: PresenceAvatarStackProps) {
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const overflowCount = collaborators.length - maxVisible;

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center -space-x-2" role="group" aria-label="Active collaborators">
      {visibleCollaborators.map((collaborator) => (
        <PresenceAvatar
          key={collaborator.id}
          collaborator={collaborator}
          size={size}
        />
      ))}
      {overflowCount > 0 && (
        <div
          className="relative inline-flex items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.35,
          }}
          title={`${overflowCount} more collaborator${overflowCount > 1 ? 's' : ''}`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

export interface PresenceIndicatorsProps {
  /** Maximum avatars to show */
  maxVisible?: number;
  /** Avatar size */
  size?: number;
  /** Whether to show connection status */
  showConnectionStatus?: boolean;
  /** Timeout in ms before removing disconnected users (default: 5000) */
  disconnectTimeout?: number;
}

/**
 * Main presence indicators component
 * Shows connected collaborators and handles disconnect timeout
 */
export function PresenceIndicators({
  maxVisible = 4,
  size = 32,
  showConnectionStatus = true,
  disconnectTimeout = 5000,
}: PresenceIndicatorsProps) {
  const { collaborators, connectionStatus } = useCollaboration();
  const [displayedCollaborators, setDisplayedCollaborators] = useState<CollaboratorInfo[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Handle collaborator presence with disconnect timeout
  useEffect(() => {
    const currentIds = new Set(collaborators.map((c) => c.id));
    const displayedIds = new Set(displayedCollaborators.map((c) => c.id));

    // Add new collaborators immediately
    const newCollaborators = collaborators.filter((c) => !displayedIds.has(c.id));
    
    // Schedule removal for collaborators that left
    displayedCollaborators.forEach((displayed) => {
      if (!currentIds.has(displayed.id) && !timeoutsRef.current.has(displayed.id)) {
        // Schedule removal after timeout
        const timeoutId = setTimeout(() => {
          setDisplayedCollaborators((prev) =>
            prev.filter((c) => c.id !== displayed.id)
          );
          timeoutsRef.current.delete(displayed.id);
        }, disconnectTimeout);
        
        timeoutsRef.current.set(displayed.id, timeoutId);
      }
    });

    // Cancel removal for collaborators that reconnected
    collaborators.forEach((c) => {
      const existingTimeout = timeoutsRef.current.get(c.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutsRef.current.delete(c.id);
      }
    });

    // Update displayed collaborators
    if (newCollaborators.length > 0) {
      setDisplayedCollaborators((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const toAdd = newCollaborators.filter((c) => !existingIds.has(c.id));
        return [...prev, ...toAdd];
      });
    }

    // Update existing collaborators (e.g., cursor position changes)
    setDisplayedCollaborators((prev) =>
      prev.map((displayed) => {
        const updated = collaborators.find((c) => c.id === displayed.id);
        return updated || displayed;
      })
    );

    // Cleanup timeouts on unmount
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, [collaborators, disconnectTimeout, displayedCollaborators]);

  return (
    <div className="flex items-center gap-3">
      <PresenceAvatarStack
        collaborators={displayedCollaborators}
        maxVisible={maxVisible}
        size={size}
      />
      {showConnectionStatus && (
        <ConnectionStatusIndicator status={connectionStatus} />
      )}
    </div>
  );
}

export interface ConnectionStatusIndicatorProps {
  /** Current connection status */
  status: ConnectionStatus;
}

/**
 * Shows current connection status with appropriate styling
 */
export function ConnectionStatusIndicator({ status }: ConnectionStatusIndicatorProps) {
  const statusConfig = {
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting...',
      pulse: true,
    },
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      pulse: false,
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Offline',
      pulse: true,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <span
        className={`inline-block h-2 w-2 rounded-full ${config.color} ${
          config.pulse ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      />
      <span className="sr-only">{config.text}</span>
    </div>
  );
}

/**
 * Cursor overlay component for showing remote cursors in the document
 */
export interface CursorOverlayProps {
  /** Collaborator whose cursor to display */
  collaborator: CollaboratorInfo;
}

export function CursorOverlay({ collaborator }: CursorOverlayProps) {
  if (!collaborator.cursor) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: collaborator.cursor.x,
        top: collaborator.cursor.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: collaborator.color }}
      >
        <path
          d="M0 0L16 12L8 12L4 20L0 0Z"
          fill="currentColor"
        />
      </svg>
      {/* Name label */}
      <div
        className="ml-4 -mt-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.name}
      </div>
    </div>
  );
}

/**
 * Container for all remote cursors
 */
export function RemoteCursors() {
  const { collaborators } = useCollaboration();

  return (
    <>
      {collaborators
        .filter((c) => c.cursor)
        .map((collaborator) => (
          <CursorOverlay key={collaborator.id} collaborator={collaborator} />
        ))}
    </>
  );
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
