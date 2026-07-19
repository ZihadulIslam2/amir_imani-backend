import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateSubscriberDto {
  @ApiPropertyOptional({
    description: 'Subscriber full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  subscriberName?: string;

  @ApiProperty({
    description: 'Subscriber email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Game name',
    example: 'Doundo Adventure',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  game?: string;

  @ApiPropertyOptional({ description: 'Game category', example: 'Action' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  gameCategory?: string;

  @ApiPropertyOptional({
    description: 'Expected release date for the game',
    example: '2026-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;
}
