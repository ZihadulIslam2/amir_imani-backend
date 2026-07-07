import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentType {
  FULL_REPORT = 'fullReport',
  BOOK_SEASON = 'bookSeason',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'The MongoDB user ID associated with this payment', example: '60d21b4667d0d8992e610c85' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Total charge amount', example: 120.50 })
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Optionally link a season ID', example: 'season_123' })
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiPropertyOptional({ description: 'Success redirect URL', example: 'https://example.com/payment/success' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL', example: 'https://example.com/payment/cancel' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @ApiPropertyOptional({ description: 'List of product / cart item IDs related to the payment', example: ['60d21b4667d0d8992e610c85'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];
}
