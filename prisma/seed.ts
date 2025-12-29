import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      passwordHash,
    },
  });

  console.log('Created user:', user.email);

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'demo-workspace' },
    update: {},
    create: {
      id: 'demo-workspace',
      name: 'Demo Workspace',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log('Created workspace:', workspace.name);

  // Create sample documents
  const docs = [
    { title: 'Getting Started', content: 'Welcome to Obsidian Cloud!' },
    { title: 'Project Notes', content: 'Add your notes here...' },
    { title: 'Meeting Minutes', content: 'Meeting notes...' },
  ];

  for (const doc of docs) {
    await prisma.document.create({
      data: {
        title: doc.title,
        workspaceId: workspace.id,
        authorId: user.id,
      },
    });
    console.log('Created document:', doc.title);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
