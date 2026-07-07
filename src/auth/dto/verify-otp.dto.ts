import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'The email address of the user', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The 6-digit OTP token sent to the user email', example: '123456' })
  @IsString()
  @Length(6, 6)
  token: string; // 6-digit OTP
}
