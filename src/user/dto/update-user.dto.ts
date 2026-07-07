import {
  IsOptional,
  IsString,
  IsPhoneNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'The first name of the user', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'The last name of the user', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'The date of birth of the user', example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ description: 'The avatar URL of the user', example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'The gender of the user', enum: ['male', 'female'], example: 'male' })
  @IsOptional()
  @IsEnum(['male', 'female'])
  gender?: string;

  @ApiPropertyOptional({ description: 'The physical address of the user', example: '123 Main St, New York, NY' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'The phone number of the user', example: '+1234567890' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNum?: number;
}
