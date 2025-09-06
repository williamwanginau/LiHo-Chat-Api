import { PrismaService } from './prisma.service';

describe('PrismaService lifecycle', () => {
  it('calls $connect on onModuleInit', async () => {
    const svc = new PrismaService();
    const spy = jest
      .spyOn(svc, '$connect')
      .mockImplementation(async () => {});
    await svc.onModuleInit();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls $disconnect on onModuleDestroy', async () => {
    const svc = new PrismaService();
    const spy = jest
      .spyOn(svc, '$disconnect')
      .mockImplementation(async () => {});
    await svc.onModuleDestroy();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
