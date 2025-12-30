# Obsidian Cloud

A collaborative document editor with auto-save, offline support, and real-time sync.

## Tech Stack used in this curd application

Next.js 16 • React 19 • TypeScript • TipTap • Yjs • Prisma • PostgreSQL • NextAuth.js • Tailwind CSS

## Features

-**Seamless Auto-Save** - Saves every change instantly (100ms) without interrupting typing
- **Real-time Collaboration** - CRDT-based sync using Yjs
- **Slash Commands** - Quick formatting with `/` menu
- **Offline Support** - Works offline, syncs when back online
- **Dark/Light Theme** - System-aware theme switching
- **Authentication** - Secure sign-up and sign-in
- **PostgreSQL Database** - Reliable data persistence with Prisma ORM

## Quick Start

### Option 1: Prisma Postgres (Cloud)

```bash
npm install
cp .env.example .env
# Edit .env with your Prisma Postgres credentials from https://prisma.io/data-platform
npm run db:generate && npm run db:push && npm run dev
```
## CMD for vercel portgress prisma setup
'on vercle portgress connetion'
`npx prisma generate`
`npx prisma db push`

### Option 2: Local PostgreSQL (pgAdmin 4)

1. Open pgAdmin 4 → Create database named `obsidian_cloud`
2. Run:
```bash
npm install
cp .env.example .env
# Edit .env: DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/obsidian_cloud"
# Edit .env: DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/obsidian_cloud"
npm run db:generate && npm run db:push && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
