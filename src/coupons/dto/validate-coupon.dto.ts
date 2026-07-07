import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ description: 'The coupon code to validate', example: 'SUMMER50' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'The MongoDB user ID attempting validation', example: '60d21b4667d0d8992e610c85' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Total price of items in the cart', example: 100.0 })
  @IsNumber()
  @Min(0)
  cartTotal: number;
}
