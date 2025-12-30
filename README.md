# Obsidian Cloud

## Features

-**Seamless Auto-Save** - Saves every change instantly (100ms) without interrupting typing
- **Real-time Collaboration** - CRDT-based sync using Yjs
- **Slash Commands** - Quick formatting with `/` menu
- **Offline Support** - Works offline, syncs when back online
- **Dark/Light Theme** - System-aware theme switching
- **Authentication** - Secure sign-up and sign-in
- **PostgreSQL Database** - Reliable data persistence with Prisma ORM

## Tech Stack CRUD Application 

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, TypeScript, Tailwind CSS
- **Editor:** TipTap (ProseMirror)
- **CRDT:** Yjs for conflict-free collaboration
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js v5
- **Deployment:** Vercel (recommended)

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/obsidian_cloud" or "vercle portgress prisma url"
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"
```

### 3. Setup database

```bash
# Generate Prisma client
npm run db:generate
npm run db:push

# Seed with demo data (optional)
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Authentication

### Sign Up
- Create account at `/sign-up`
- Email, password (min 8 characters), and optional name
- Default workspace created automatically

### Sign In
- Sign in at `/sign-in`
- Demo credentials (if seeded):
  - Email: `demo@example.com`
  - Password: `password123`

## Scripts
 'on local portgres connection'
 `npm run db:generate`  Generate Prisma client 
 `npm run db:push`  Push schema to database 
 `npm run db:seed`  Seed demo data 

## CMD for vercel portgress prisma setup
'on vercle portgress connetion'
`npx prisma generate`
`npx prisma db push`



## How Auto-Save Works

1. **Type freely** - No interruptions, editor stays focused
2. **Yjs captures changes** - Every keystroke updates the CRDT document
3. **100ms batch window** - Rapid changes are batched together
4. **Save to database** - Yjs binary state saved to PostgreSQL
5. **Offline queue** - Changes queued when offline, synced when back online

**Result:** Seamless Google Docs-like experience with zero focus loss!

