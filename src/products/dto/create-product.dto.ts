import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory, ProductType } from '../product.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Gold Tarot Card Deck',
  })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'The price of the product', example: 29.99 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    description: 'A short feature highlight of the product',
    example: 'Handmade, Premium Gold Foil',
  })
  @IsString()
  @IsNotEmpty()
  feature: string;

  @ApiProperty({
    description: 'The detailed description of the product',
    example:
      'A complete 78-card deck with gorgeous gold foil details and an instructional booklet.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'A video walkthrough link or demo link',
    example: 'https://youtube.com/watch?v=123',
  })
  @IsString()
  @IsOptional()
  videoLink?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Product images to upload (supports file upload or string URLs)',
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imgs?: string[];

  @ApiProperty({
    description: 'The type category of the product',
    enum: ProductType,
    example: ProductType.CARD,
  })
  @IsEnum(ProductType, {
    message: 'Product type must be card or marchandice',
  })
  productType: ProductType;

  @ApiPropertyOptional({
    description:
      'Merchandise category. Only allowed when productType is marchandice.',
    enum: ProductCategory,
    example: ProductCategory.APPAREL,
  })
  @IsEnum(ProductCategory, {
    message:
      'Category must be one of: ALL, APPAREL, ACCESSORIES, PRINTS & POSTERS, STATIONERY, HOME & DECOR, COLLECTIBLES',
  })
  @IsOptional()
  category?: ProductCategory;

  @ApiPropertyOptional({
    description: 'Available colors for the product',
    example: ['gold', 'black'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional({
    description: 'Available sizes for the product',
    example: ['s', 'm', 'l'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  size?: string[];

  @ApiPropertyOptional({
    description: 'Stock quantity of the product',
    example: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  quantity?: number;
}
