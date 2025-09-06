import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : value;
const toLower = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.toLowerCase() : value;

export class RegisterDto {
  @Transform(toLower)
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 64)
  name!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}

