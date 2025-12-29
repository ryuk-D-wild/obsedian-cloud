'use client';

/**
 * Slash Command Menu Component
 * Contextual menu triggered by typing "/" for quick actions
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4 - Slash command functionality
 * Requirements: 7.4 - Keyboard navigation and accessibility
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Editor, Range } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  type LucideIcon,
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  action: (editor: Editor, range: Range) => void;
  /** Optional keyboard shortcut hint (e.g., "Ctrl+Shift+1") */
  shortcut?: string;
}

export interface SlashCommandMenuProps {
  editor: Editor;
  commands?: SlashCommand[];
  onSelect?: (command: SlashCommand) => void;
}

/**
 * Default slash commands for the editor
 */
export const defaultCommands: SlashCommand[] = [
  {
    id: 'heading1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1,
    keywords: ['h1', 'heading', 'title', 'large'],
    shortcut: 'Ctrl+Alt+1',
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    keywords: ['h2', 'heading', 'subtitle', 'medium'],
    shortcut: 'Ctrl+Alt+2',
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: Heading3,
    keywords: ['h3', 'heading', 'small'],
    shortcut: 'Ctrl+Alt+3',
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    id: 'bulletList',
    label: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: List,
    keywords: ['ul', 'unordered', 'bullet', 'list', 'items'],
    shortcut: 'Ctrl+Shift+8',
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: 'orderedList',
    label: 'Numbered List',
    description: 'Create a numbered list',
    icon: ListOrdered,
    keywords: ['ol', 'ordered', 'numbered', 'list', 'items'],
    shortcut: 'Ctrl+Shift+7',
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: 'codeBlock',
    label: 'Code Block',
    description: 'Add a code snippet',
    icon: Code,
    keywords: ['code', 'snippet', 'pre', 'programming'],
    shortcut: 'Ctrl+Alt+C',
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: 'blockquote',
    label: 'Quote',
    description: 'Add a blockquote',
    icon: Quote,
    keywords: ['quote', 'blockquote', 'citation'],
    shortcut: 'Ctrl+Shift+B',
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: 'horizontalRule',
    label: 'Divider',
    description: 'Add a horizontal divider',
    icon: Minus,
    keywords: ['hr', 'divider', 'separator', 'line'],
    action: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

/**
 * Filter commands based on search query
 * Matches against label and keywords (case-insensitive substring match)
 */
export function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  if (!query) return commands;
  
  const lowerQuery = query.toLowerCase();
  return commands.filter((command) => {
    const labelMatch = command.label.toLowerCase().includes(lowerQuery);
    const keywordMatch = command.keywords.some((keyword) =>
      keyword.toLowerCase().includes(lowerQuery)
    );
    return labelMatch || keywordMatch;
  });
}


/**
 * Slash Command Menu Component
 * Displays filtered commands and handles selection
 * 
 * Accessibility features:
 * - Full keyboard navigation (Arrow keys, Enter, Escape, Tab)
 * - ARIA roles and attributes for screen readers
 * - Focus management
 * - Live region announcements
 */
export function SlashCommandMenu({
  editor,
  commands = defaultCommands,
  onSelect,
}: SlashCommandMenuProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [range, setRange] = useState<Range | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = useMemo(
    () => filterCommands(commands, query),
    [commands, query]
  );

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen]);

  // Announce selection changes to screen readers
  useEffect(() => {
    if (isOpen && liveRegionRef.current && filteredCommands[selectedIndex]) {
      const command = filteredCommands[selectedIndex];
      liveRegionRef.current.textContent = `${command.label}: ${command.description}. ${selectedIndex + 1} of ${filteredCommands.length}`;
    }
  }, [selectedIndex, filteredCommands, isOpen]);

  // Handle command selection
  const selectCommand = useCallback(
    (command: SlashCommand) => {
      if (range) {
        command.action(editor, range);
        onSelect?.(command);
      }
      setIsOpen(false);
      setQuery('');
    },
    [editor, range, onSelect]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev <= 0 ? filteredCommands.length - 1 : prev - 1
          );
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev >= filteredCommands.length - 1 ? 0 : prev + 1
          );
          break;
        case 'Tab':
          // Tab navigates like arrow keys within the menu
          event.preventDefault();
          if (event.shiftKey) {
            setSelectedIndex((prev) =>
              prev <= 0 ? filteredCommands.length - 1 : prev - 1
            );
          } else {
            setSelectedIndex((prev) =>
              prev >= filteredCommands.length - 1 ? 0 : prev + 1
            );
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            selectCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setQuery('');
          editor.commands.focus();
          break;
        case 'Home':
          event.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setSelectedIndex(filteredCommands.length - 1);
          break;
      }
    },
    [isOpen, filteredCommands, selectedIndex, selectCommand, editor]
  );

  // Listen for "/" keypress to open menu
  useEffect(() => {
    const handleSlashKey = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      
      // Get text before cursor
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      
      // Check if "/" was just typed
      if (textBefore.endsWith('/')) {
        const coords = editor.view.coordsAtPos($from.pos);
        setPosition({ x: coords.left, y: coords.bottom + 8 });
        setRange({
          from: $from.pos - 1,
          to: $from.pos,
        });
        setIsOpen(true);
        setQuery('');
      }
    };

    editor.on('update', handleSlashKey);
    return () => {
      editor.off('update', handleSlashKey);
    };
  }, [editor]);


  // Track query as user types after "/"
  useEffect(() => {
    if (!isOpen || !range) return;

    const handleUpdate = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      
      // Find the "/" and get text after it
      const slashIndex = textBefore.lastIndexOf('/');
      if (slashIndex === -1) {
        setIsOpen(false);
        setQuery('');
        return;
      }
      
      const newQuery = textBefore.slice(slashIndex + 1);
      setQuery(newQuery);
      
      // Update range to include the query
      setRange({
        from: range.from,
        to: $from.pos,
      });
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, isOpen, range]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen || filteredCommands.length === 0) {
    return null;
  }

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      <div
        ref={menuRef}
        className="fixed z-50 w-72 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
        }}
        role="listbox"
        aria-label="Slash commands menu"
        aria-activedescendant={filteredCommands[selectedIndex]?.id}
        tabIndex={-1}
      >
        <div 
          className="p-2 text-xs text-muted-foreground border-b border-border"
          id="slash-menu-instructions"
        >
          <span aria-hidden="true">Type to filter • ↑↓ to navigate • Enter to select • Esc to close</span>
          <span className="sr-only">
            Type to filter commands. Use arrow keys to navigate, Enter to select, Escape to close.
          </span>
        </div>
        <div 
          className="max-h-64 overflow-y-auto"
          role="group"
          aria-describedby="slash-menu-instructions"
        >
          {filteredCommands.map((command, index) => {
            const Icon = command.icon;
            const isSelected = index === selectedIndex;
            
            return (
              <button
                key={command.id}
                ref={(el) => { itemRefs.current[index] = el; }}
                id={command.id}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  isSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => selectCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={isSelected}
                aria-label={`${command.label}: ${command.description}${command.shortcut ? `. Keyboard shortcut: ${command.shortcut}` : ''}`}
                tabIndex={isSelected ? 0 : -1}
              >
                <div 
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted"
                  aria-hidden="true"
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{command.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {command.description}
                  </div>
                </div>
                {command.shortcut && (
                  <div 
                    className="flex-shrink-0 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                    aria-hidden="true"
                  >
                    {command.shortcut}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default SlashCommandMenu;
