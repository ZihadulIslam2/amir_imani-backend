import {
  IsArray,
  IsNumber,
  IsMongoId,
  IsNotEmpty,
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

  @ApiProperty({ description: 'Quantity of the product', example: 1, minimum: 1 })
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

export class UpdateCartDto {
  @ApiProperty({ type: [CartItemDto], description: 'List of items to update in the cart' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  productIds: CartItemDto[];
}
