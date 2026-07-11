import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'The product ID being reviewed',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Star rating from 1 to 5', example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'The review content',
    example: 'Great quality and very comfortable to wear.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  review: string;

  @ApiPropertyOptional({
    description: 'Reviewer name for guest submissions',
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  userName?: string;

  @ApiPropertyOptional({
    description: 'Reviewer email for guest submissions',
    example: 'jane@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  userEmail?: string;
}
