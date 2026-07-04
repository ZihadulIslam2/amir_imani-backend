import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  address: string;

  @IsString()
  phoneNum: string;
}
