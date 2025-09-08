import { Body, Controller, Get, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { RoomsService } from './rooms.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomsListResponseDto } from './dto/rooms-list.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async listRooms(@Req() req: Request & { user?: { userId: string; email: string } }): Promise<RoomsListResponseDto> {
    const userId = req.user?.userId ?? null;
    const items = await this.rooms.listRooms(userId);
    return { items, serverTime: new Date() };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createRoom(
    @Req() req: Request & { user?: { userId: string; email: string } },
    @Body() dto: CreateRoomDto,
  ): Promise<RoomResponseDto> {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.rooms.createRoom(userId, dto);
  }
}
