# Obsidian Cloud Features

## Editor
- Rich text editing with TipTap
- Slash commands (`/`) for quick formatting
- Keyboard shortcuts (Ctrl+B bold, Ctrl+I italic, etc.)
- Headings, lists, code blocks, blockquotes, dividers
- Real-time auto-save (100ms delay - feels instant)

## Collaboration
- Yjs CRDT for conflict-free editing
- Document state persisted as binary Yjs format
- Offline support with automatic sync on reconnect
- Changes queued locally when offline

## Documents
- Create, rename, delete documents
- Workspace-based organization
- Document list with timestamps

## Authentication
- Email/password sign-in and sign-up
- Session management with NextAuth v5
- Secure password hashing (bcrypt)

## UI/UX
- Dark/Light/System theme toggle
- Responsive sidebar
- Toast notifications
- Loading skeletons
- Accessible (ARIA labels, keyboard navigation)

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- Prisma 7 with Prisma Postgres (Accelerate)
- TipTap + Yjs
- Tailwind CSS 4
- TypeScript
