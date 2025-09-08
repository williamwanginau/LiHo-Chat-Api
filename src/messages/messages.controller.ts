import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ListMessagesQueryDto } from './dto/list-messages.query.dto';
import { MessagesPageDto } from './dto/message-response.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { MessagesService } from './messages.service';
import { Request } from 'express';
import { decodeCursor } from '../common/cursor.util';
import { Req } from '@nestjs/common';

@Controller('rooms/:id/messages')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async list(
    @Param('id') roomId: string,
    @Query() q: ListMessagesQueryDto,
    @Req() req: Request & { user?: { userId: string; email: string } },
  ): Promise<MessagesPageDto> {
    // Additional cursor sanity beyond DTO (decode)
    if (q.cursor) {
      try {
        decodeCursor(q.cursor);
      } catch {
        throw new BadRequestException('INVALID_CURSOR');
      }
    }
    const userId = req.user?.userId ?? null;
    return this.svc.listRoomMessages({ roomId, userId, limit: q.limit, cursor: q.cursor });
  }
}
