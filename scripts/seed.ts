/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Safety: block seeding in production unless explicitly allowed
  const allowProd = process.env.SEED_ALLOW_PROD === 'true' || process.env.SEED_ALLOW_PROD === '1';
  if (process.env.NODE_ENV === 'production' && !allowProd) {
    console.error('Seeding is blocked in production. Set SEED_ALLOW_PROD=true to override.');
    process.exit(1);
  }

  const demoHash = await bcrypt.hash('demo', 10);
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', name: 'Alice', passwordHash: demoHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', name: 'Bob', passwordHash: demoHash },
  });

  const room = await prisma.room.upsert({
    where: { id: 'public' },
    update: {},
    create: { id: 'public', name: 'Public Room', isPrivate: false },
  });

  await prisma.membership.upsert({
    where: { userId_roomId: { userId: alice.id, roomId: room.id } },
    update: {},
    create: { userId: alice.id, roomId: room.id },
  });

  await prisma.membership.upsert({
    where: { userId_roomId: { userId: bob.id, roomId: room.id } },
    update: {},
    create: { userId: bob.id, roomId: room.id },
  });

  await prisma.message.createMany({
    data: [
      { roomId: room.id, userId: alice.id, content: 'Hello from Alice!' },
      { roomId: room.id, userId: bob.id, content: 'Hello from Bob!' },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
