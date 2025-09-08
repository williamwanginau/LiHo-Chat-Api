export class LastMessageDto {
  content!: string;
  createdAt!: Date;
}

export class RoomResponseDto {
  id!: string;
  name!: string;
  isPrivate!: boolean;
  updatedAt!: Date;
  lastMessage?: LastMessageDto;
}

