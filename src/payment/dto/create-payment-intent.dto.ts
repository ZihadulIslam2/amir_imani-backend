import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingAddressDto {
  @ApiProperty({ description: 'The street address', example: '123 Main St' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'The city', example: 'Toronto' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'The state or province', example: 'ON' })
  @IsString()
  province: string;

  @ApiProperty({ description: 'The postal code / zip code', example: 'M5V 2N2' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'The country', example: 'Canada' })
  @IsString()
  country: string;
}

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'The MongoDB user ID placing the order', example: '60d21b4667d0d8992e610c85' })
  @IsString()
  userId: string;

  @ApiProperty({ type: ShippingAddressDto, description: 'The shipping address for physical merchandise' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({ description: 'Payment currency option (usd/cad)', enum: ['usd', 'cad'], example: 'usd' })
  @IsOptional()
  @IsString()
  currency?: 'usd' | 'cad';

  @ApiPropertyOptional({ description: 'Optional coupon code to apply discount', example: 'SUMMER20' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
