'use client';

/**
 * Document Editor Component
 * Rich text editor using TipTap with Yjs binding for real-time collaboration
 * 
 * Requirements: 3.1, 3.2 - Real-time collaboration with CRDT sync
 * Requirements: 4.1, 4.2, 4.3, 4.4 - Slash command functionality
 * Requirements: 7.4 - Keyboard navigation and accessibility
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import { useCollaboration } from '@/components/collaboration';
import { SlashCommandMenu, type SlashCommand } from './slash-command-menu';

export interface EditorProps {
  /** Document ID for collaboration */
  documentId: string;
  /** Initial content as HTML string */
  initialContent?: string;
  /** Current user ID */
  userId: string;
  /** Current user display name */
  userName?: string;
  /** User's assigned color for cursor */
  userColor?: string;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when content changes */
  onUpdate?: (content: string) => void;
  /** Callback when editor is ready */
  onReady?: (editor: Editor) => void;
  /** Callback when a slash command is selected */
  onSlashCommand?: (command: SlashCommand) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Rich text editor with real-time collaboration support
 * 
 * Keyboard shortcuts:
 * - Ctrl+B: Bold
 * - Ctrl+I: Italic
 * - Ctrl+U: Underline (if supported)
 * - Ctrl+Shift+S: Strikethrough
 * - Ctrl+Alt+1/2/3: Heading 1/2/3
 * - Ctrl+Shift+7: Ordered list
 * - Ctrl+Shift+8: Bullet list
 * - Ctrl+Shift+B: Blockquote
 * - Ctrl+Alt+C: Code block
 * - Ctrl+`: Inline code
 */
export function DocumentEditor({
  userId,
  userName = 'Anonymous',
  userColor,
  initialContent,
  placeholder = 'Start typing or press "/" for commands...',
  readOnly = false,
  onUpdate,
  onReady,
  onSlashCommand,
  className = '',
}: EditorProps) {
  // Try to use collaboration if provider is available, otherwise work standalone
  let provider = null;
  let connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  let collaborators: any[] = [];
  
  try {
    const collaboration = useCollaboration();
    provider = collaboration.provider;
    connectionStatus = collaboration.connectionStatus;
    collaborators = collaboration.collaborators;
  } catch {
    // No collaboration provider available, work in standalone mode
  }

  // Get the Yjs fragment for ProseMirror binding
  const yjsFragment = useMemo(() => {
    if (!provider) return null;
    return provider.getXmlFragment('prosemirror');
  }, [provider]);

  // Generate a color for the user if not provided
  const cursorColor = useMemo(() => {
    if (userColor) return userColor;
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    ];
    return colors[Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
  }, [userId, userColor]);

  // Configure TipTap editor with extensions
  const editor = useEditor({
    // Prevent SSR hydration mismatch
    immediatelyRender: false,
    content: initialContent || '',
    extensions: [
      StarterKit.configure({
        // Enable history for undo/redo when not using collaboration
        history: provider ? false : {},
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      // Collaboration extension for Yjs binding (only if provider available)
      ...(yjsFragment && provider
        ? [
            Collaboration.configure({
              fragment: yjsFragment,
            }),
            // Only add cursor extension if provider has awareness
            ...(provider.getWebsocketProvider()?.awareness
              ? [
                  CollaborationCursor.configure({
                    provider: provider.getWebsocketProvider(),
                    user: {
                      name: userName,
                      color: cursorColor,
                    },
                  }),
                ]
              : []),
          ]
        : []),
    ],
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert focus:outline-none min-h-[200px] max-w-none ${className}`,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Document editor. Press slash for commands.',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      onReady?.(editor);
    },
  }, [yjsFragment, provider, userName, cursorColor, placeholder, readOnly, className, initialContent]);

  // Handle keyboard shortcuts for formatting
  // Requirements: 7.4 - Keyboard navigation
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    if (!editor || readOnly) return;

    const isMod = event.ctrlKey || event.metaKey;
    
    // Heading shortcuts: Ctrl+Alt+1/2/3
    if (isMod && event.altKey && !event.shiftKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          return;
        case '2':
          event.preventDefault();
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          return;
        case '3':
          event.preventDefault();
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          return;
        case 'c':
        case 'C':
          event.preventDefault();
          editor.chain().focus().toggleCodeBlock().run();
          return;
      }
    }

    // List and blockquote shortcuts: Ctrl+Shift+key
    if (isMod && event.shiftKey && !event.altKey) {
      switch (event.key) {
        case '7':
        case '&': // Shift+7 on some keyboards
          event.preventDefault();
          editor.chain().focus().toggleOrderedList().run();
          return;
        case '8':
        case '*': // Shift+8 on some keyboards
          event.preventDefault();
          editor.chain().focus().toggleBulletList().run();
          return;
        case 'b':
        case 'B':
          event.preventDefault();
          editor.chain().focus().toggleBlockquote().run();
          return;
        case 's':
        case 'S':
          event.preventDefault();
          editor.chain().focus().toggleStrike().run();
          return;
      }
    }

    // Inline code: Ctrl+`
    if (isMod && event.key === '`') {
      event.preventDefault();
      editor.chain().focus().toggleCode().run();
      return;
    }
  }, [editor, readOnly]);

  // Add keyboard shortcut listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [handleKeyboardShortcuts]);

  // Update cursor position on selection change
  useEffect(() => {
    if (!editor || !provider) return;

    const updateCursor = () => {
      const { from, to } = editor.state.selection;
      provider.updateCursor({ x: from, y: to });
    };

    editor.on('selectionUpdate', updateCursor);
    return () => {
      editor.off('selectionUpdate', updateCursor);
    };
  }, [editor, provider]);

  // Clean up editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div 
      className="document-editor relative"
      role="region"
      aria-label="Document editor"
    >
      {/* Connection status indicator - only show if collaboration is enabled */}
      {provider && (
        <div 
          className="absolute top-2 right-2 flex items-center gap-2 text-xs"
          role="status"
          aria-live="polite"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-500'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
            aria-hidden="true"
          />
          <span className="text-muted-foreground capitalize">
            {connectionStatus}
          </span>
          {collaborators.length > 0 && (
            <span className="text-muted-foreground">
              • {collaborators.length} other{collaborators.length !== 1 ? 's' : ''} editing
            </span>
          )}
          <span className="sr-only">
            {connectionStatus === 'connected' 
              ? `Connected. ${collaborators.length} other user${collaborators.length !== 1 ? 's' : ''} editing.`
              : connectionStatus === 'connecting'
              ? 'Connecting to collaboration server...'
              : 'Disconnected from collaboration server.'}
          </span>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} className="mt-8" />

      {/* Slash Command Menu - Requirements: 4.1, 4.2, 4.3, 4.4 */}
      {editor && !readOnly && (
        <SlashCommandMenu 
          editor={editor} 
          onSelect={onSlashCommand}
        />
      )}

      {/* Keyboard shortcuts help - screen reader only */}
      <div className="sr-only" aria-label="Keyboard shortcuts">
        <p>Keyboard shortcuts available:</p>
        <ul>
          <li>Control+B for bold</li>
          <li>Control+I for italic</li>
          <li>Control+Shift+S for strikethrough</li>
          <li>Control+Alt+1, 2, or 3 for headings</li>
          <li>Control+Shift+7 for numbered list</li>
          <li>Control+Shift+8 for bullet list</li>
          <li>Control+Shift+B for blockquote</li>
          <li>Control+Alt+C for code block</li>
          <li>Control+backtick for inline code</li>
          <li>Forward slash for command menu</li>
        </ul>
      </div>

      {/* Editor styles */}
      <style jsx global>{`
        .ProseMirror {
          padding: 1rem;
          min-height: 200px;
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        /* Collaboration cursor styles */
        .collaboration-cursor__caret {
          border-left: 1px solid;
          border-right: 1px solid;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: #fff;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 0.1rem 0.3rem;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

export default DocumentEditor;
