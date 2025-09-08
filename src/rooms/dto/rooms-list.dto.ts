import { RoomResponseDto } from './room-response.dto';

export class RoomsListResponseDto {
  items!: RoomResponseDto[];
  nextCursor?: string;
  hasMore?: boolean;
  serverTime!: Date;
}

