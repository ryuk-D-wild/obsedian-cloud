'use client';

import * as React from 'react';
import { MoreHorizontal, FileText, Trash2, ExternalLink, Plus, Loader2, Edit2, Check, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: Date;
  isPending?: boolean;
}

export interface DocumentListProps {
  documents: DocumentSummary[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onCreate: () => void;
  isCreating?: boolean;
  deletingIds?: string[];
}

/**
 * Formats a date to a human-readable relative time string.
 * Requirements: 2.5 - Display last-modified timestamps
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Document list component using Shadcn/ui Table.
 * Requirements: 2.5, 7.1, 7.2 - Display documents with accessibility and responsive design
 */
export function DocumentList({
  documents,
  onSelect,
  onDelete,
  onRename,
  onCreate,
  isCreating = false,
  deletingIds = [],
}: DocumentListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const startEditing = (doc: DocumentSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim() && editTitle !== documents.find(d => d.id === id)?.title) {
      onRename?.(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Documents</h2>
        <Button
          onClick={onCreate}
          disabled={isCreating}
          size="sm"
          aria-label="Create new document"
        >
          {isCreating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">New Document</span>
        </Button>
      </div>

      {/* Empty state */}
      {documents.length === 0 && (
        <div 
          className="flex flex-col items-center justify-center py-12 text-center"
          role="status"
          aria-label="No documents"
        >
          <FileText className="size-12 text-muted-foreground mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-foreground mb-1">No documents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first document to get started.
          </p>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
            ) : (
              <Plus className="size-4 mr-2" aria-hidden="true" />
            )}
            Create Document
          </Button>
        </div>
      )}

      {/* Desktop table view */}
      {documents.length > 0 && (
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Title</TableHead>
                <TableHead className="w-[35%]">Last Modified</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const isDeleting = deletingIds.includes(doc.id);
                const isPending = doc.isPending || isDeleting;
                
                return (
                  <TableRow
                    key={doc.id}
                    className={cn(
                      'cursor-pointer',
                      isPending && 'opacity-50'
                    )}
                    onClick={() => !isPending && onSelect(doc.id)}
                    data-pending={isPending || undefined}
                    aria-busy={isPending}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        {editingId === doc.id ? (
                          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={inputRef}
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(doc.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => saveEdit(doc.id)}
                            >
                              <Check className="size-3" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="truncate">{doc.title}</span>
                        )}
                        {doc.isPending && (
                          <Loader2 className="size-3 animate-spin text-muted-foreground" aria-label="Saving" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <time dateTime={doc.updatedAt.toISOString()}>
                        {formatRelativeTime(doc.updatedAt)}
                      </time>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isPending}
                            aria-label={`Actions for ${doc.title}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(doc.id);
                            }}
                          >
                            <ExternalLink className="size-4" aria-hidden="true" />
                            Open
                          </DropdownMenuItem>
                          {onRename && (
                            <DropdownMenuItem
                              onClick={(e) => startEditing(doc, e)}
                            >
                              <Edit2 className="size-4" aria-hidden="true" />
                              Rename
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(doc.id);
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile card view */}
      {documents.length > 0 && (
        <div className="md:hidden space-y-2" role="list" aria-label="Documents">
          {documents.map((doc) => {
            const isDeleting = deletingIds.includes(doc.id);
            const isPending = doc.isPending || isDeleting;
            
            return (
              <div
                key={doc.id}
                role="listitem"
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border bg-card',
                  'hover:bg-accent/50 transition-colors cursor-pointer',
                  isPending && 'opacity-50'
                )}
                onClick={() => !isPending && onSelect(doc.id)}
                data-pending={isPending || undefined}
                aria-busy={isPending}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{doc.title}</p>
                      {doc.isPending && (
                        <Loader2 className="size-3 animate-spin text-muted-foreground" aria-label="Saving" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={doc.updatedAt.toISOString()}>
                        {formatRelativeTime(doc.updatedAt)}
                      </time>
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => e.stopPropagation()}
                      disabled={isPending}
                      aria-label={`Actions for ${doc.title}`}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(doc.id);
                      }}
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                      Open
                    </DropdownMenuItem>
                    {onRename && (
                      <DropdownMenuItem
                        onClick={(e) => startEditing(doc, e)}
                      >
                        <Edit2 className="size-4" aria-hidden="true" />
                        Rename
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
