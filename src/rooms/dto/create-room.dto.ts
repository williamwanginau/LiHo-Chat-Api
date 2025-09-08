import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateRoomDto {
  @Transform(trim)
  @IsString()
  @Length(1, 64)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = false;
}

