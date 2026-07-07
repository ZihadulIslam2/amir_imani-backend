import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'The first name of the user', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'The last name of the user', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'The email address of the user', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The password for the account (minimum 6 characters)', example: 'password123', required: false })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ description: 'The physical address of the user', example: '123 Main St, New York, NY' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'The phone number of the user', example: '+1234567890' })
  @IsString()
  phoneNum: string;
}
