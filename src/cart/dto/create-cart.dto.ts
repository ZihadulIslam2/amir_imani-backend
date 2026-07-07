import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CartItemDto {
  @ApiProperty({ description: 'The MongoDB product ID', example: '60d21b4667d0d8992e610c85' })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity of the product to add to cart', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Chosen color of the product', example: 'gold' })
  @Optional()
  color: string;

  @ApiPropertyOptional({ description: 'Chosen size of the product', example: 'm' })
  @Optional()
  size: string;
}

export class CreateCartDto {
  @ApiProperty({ description: 'The MongoDB user ID associated with this cart', example: '60d21b4667d0d8992e610c85' })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ type: [CartItemDto], description: 'List of items in the cart' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  productIds: CartItemDto[];
}
