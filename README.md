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

## Troubleshooting

### Foreign Key Constraint Error

If you see `Foreign key constraint violated on the constraint: WorkspaceMember_userId_fkey`:

1. **Clear your browser cookies** - Your session may reference a deleted user
2. **Sign out and sign in again** - Go to `/sign-in` and re-authenticate
3. **Check database** - Ensure the user exists in the `User` table
4. **Reset database** (last resort):
   ```bash
   npx prisma db push --force-reset
   npm run db:seed
   ```

### Database Connection Timeout

If you see `ETIMEDOUT` or connection errors:

1. **Verify DATABASE_URL** - Check your `.env` file has the correct connection string
2. **For Prisma Accelerate/Postgres** - URL should start with `prisma+postgres://`
3. **Check network** - Ensure your database is accessible
4. **Vercel deployment** - Set environment variables in Vercel dashboard

### Sign-up/Sign-in Not Working on Vercel

1. **Set environment variables** in Vercel project settings:
   - `DATABASE_URL` - Your Prisma Postgres connection string
   - `AUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `AUTH_URL` - Your Vercel app URL (e.g., `https://your-app.vercel.app`)

2. **Push database schema**:
   ```bash
   npx prisma db push
   ```

3. **Check logs** - View Vercel function logs for detailed errors
