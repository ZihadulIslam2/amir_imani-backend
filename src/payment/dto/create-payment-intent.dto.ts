import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  Min,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  ValidateNested,
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

export class PaymentItemDto {
  @ApiProperty({ description: 'The MongoDB product ID', example: '60d21b4667d0d8992e610c85' })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity of the product', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Chosen color of the product', example: 'gold' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Chosen size of the product', example: 'm' })
  @IsOptional()
  @IsString()
  size?: string;
}

export class CreatePaymentIntentDto {
  @ApiPropertyOptional({ description: 'The MongoDB user ID placing the order (omit for guest checkout)', example: '60d21b4667d0d8992e610c85' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Email for guest checkout (required if userId is not provided)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'First name for guest registration', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name for guest registration', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ type: [PaymentItemDto], description: 'Cart items for checkout (required if userId is not provided, optional if userId is provided)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items?: PaymentItemDto[];

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
