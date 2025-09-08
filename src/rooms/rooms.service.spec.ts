import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomsService (unit)', () => {
  let svc: RoomsService;
  const now = new Date('2025-09-06T12:00:00.000Z');

  const prismaMock = {
    membership: {
      count: jest.fn<Promise<number>, [unknown]>(),
    },
    room: {
      findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(({} as unknown) as PrismaService)),
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    svc = new RoomsService(prismaMock);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('isMember: true when membership count > 0', async () => {
    (prismaMock.membership.count as unknown as jest.Mock).mockResolvedValue(1);
    await expect(svc.isMember('u1', 'r1')).resolves.toBe(true);
  });

  it('listRooms: maps lastMessage when present', async () => {
    (prismaMock.room.findMany as unknown as jest.Mock).mockResolvedValue([
      {
        id: 'r1',
        name: 'Room',
        isPrivate: false,
        updatedAt: now,
        messages: [{ id: 'm1', content: 'hi', createdAt: now }],
      },
      {
        id: 'r2',
        name: 'Empty',
        isPrivate: false,
        updatedAt: now,
        messages: [],
      },
    ]);
    const out = await svc.listRooms(null);
    expect(out[0].lastMessage).toEqual({ content: 'hi', createdAt: now });
    expect(out[1].lastMessage).toBeUndefined();
  });
});
