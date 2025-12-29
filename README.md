# Obsidian Cloud

A collaborative document editor with real-time sync, slash commands, and offline support.

## Features

- Real-time collaboration using CRDT (Yjs)
- Slash command menu for quick formatting
- Offline support with automatic sync
- Dark/light theme support
- PostgreSQL database with Prisma ORM
- User authentication with sign-up and sign-in

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env` and update with your PostgreSQL connection:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/obsidian_cloud"
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3000"
```

### 3. Setup database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with demo data (optional)
npm run db:seed
```

### 4. Run the app

```bash
# Development server
npm run dev

# WebSocket server for collaboration (optional)
npm run ws-server
```

Open [http://localhost:3000](http://localhost:3000)

## Authentication

### Sign Up
- Create a new account at `/sign-up`
- Provide email, password (min 8 characters), and optional name
- A default workspace is automatically created for new users

### Sign In
- Sign in at `/sign-in` with your email and password
- Demo credentials (if seeded):
  - Email: `demo@example.com`
  - Password: `password123`

## Scripts

| Command | Description |

| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run ws-server` | Start WebSocket server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |

## Tech Stack This Curd Application

- Next.js 16
- React 19
- TypeScript
- Prisma + PostgreSQL
- TipTap Editor
- Yjs (CRDT)
- NextAuth.js
- Tailwind CSS

