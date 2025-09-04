/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', name: 'Alice', passwordHash: 'demo' },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', name: 'Bob', passwordHash: 'demo' },
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

