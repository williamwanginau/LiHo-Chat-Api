import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class ListMessagesQueryDto {
  @Transform(({ value }) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : value;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;

  @IsOptional()
  // Base64-like string sanity check (len 8..512). Actual structure validated by decoder at use-time.
  @Matches(/^[A-Za-z0-9+/=]{8,512}$/)
  cursor?: string;
}

