import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';

@Module({
  imports: [PrismaModule],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}

