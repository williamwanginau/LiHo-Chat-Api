export class MessageAuthorDto {
  id!: string;
  name!: string;
}

export class MessageResponseDto {
  id!: string;
  messageId?: string; // convenience alias of id
  roomId!: string;
  content!: string;
  createdAt!: Date;
  editedAt?: Date | null;
  author!: MessageAuthorDto;
}

export class MessagesPageDto {
  items!: MessageResponseDto[];
  nextCursor?: string;
  hasMore!: boolean;
  serverTime!: Date;
}
