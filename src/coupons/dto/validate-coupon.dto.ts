import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ description: 'The coupon code to validate', example: 'SUMMER50' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'The MongoDB user ID attempting validation (optional for guests)', example: '60d21b4667d0d8992e610c85' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Total price of items in the cart', example: 100.0 })
  @IsNumber()
  @Min(0)
  cartTotal: number;
}
