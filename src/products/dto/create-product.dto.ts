import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MerchandiseBadge,
  ProductCategory,
  ProductType,
} from '../product.schema';
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
    description: 'The type of the product',
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
    description: 'Badge shown on merchandise cards',
    enum: MerchandiseBadge,
    example: MerchandiseBadge.NEW_ARRIVAL,
  })
  @IsEnum(MerchandiseBadge, {
    message: 'Invalid merchandise badge',
  })
  @IsOptional()
  merchandiseBadge?: MerchandiseBadge;

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

  @ApiPropertyOptional({
    description: 'The title for the rules section',
    example: 'How to Play',
  })
  @IsString()
  @IsOptional()
  ruleTitle?: string;

  @ApiPropertyOptional({
    description: 'Array of rule objects',
    example: [{ title: 'Setup', description: 'Place the board...' }],
  })
  @IsArray()
  @IsOptional()
  rulls?: Record<string, any>[];

  @ApiPropertyOptional({
    description: 'Title for the board anatomy section',
    example: 'Board Layout',
  })
  @IsString()
  @IsOptional()
  boardanatomyTitle?: string;

  @ApiPropertyOptional({
    description: 'Description for the board anatomy',
    example: 'The board consists of 40 spaces...',
  })
  @IsString()
  @IsOptional()
  boardAnatomyDiscription?: string;

  @ApiPropertyOptional({
    description: 'Title for the pass-and-play section',
    example: 'Pass & Play Mode',
  })
  @IsString()
  @IsOptional()
  passandplayTittle?: string;

  @ApiPropertyOptional({
    description: 'Array of pass-and-play message objects',
    example: [{ message: 'Welcome!', name: 'Player 1', type: 'text' }],
  })
  @IsArray()
  @IsOptional()
  passandplay?: { message?: string; name?: string; type?: string }[];

  @ApiPropertyOptional({
    description: 'Title for the garment section',
    example: 'Premium T-Shirt',
  })
  @IsString()
  @IsOptional()
  garmentTitle?: string;

  @ApiPropertyOptional({
    description: 'Material description for the garment',
    example: '100% Organic Cotton',
  })
  @IsString()
  @IsOptional()
  garmentsMATERIAL?: string;

  @ApiPropertyOptional({
    description: 'Weight of the garment',
    example: '200 GSM',
  })
  @IsString()
  @IsOptional()
  garmentWEIGHT?: string;

  @ApiPropertyOptional({
    description: 'Fit description for the garment',
    example: 'Regular Fit',
  })
  @IsString()
  @IsOptional()
  garmentFit?: string;

  @ApiPropertyOptional({
    description: 'Print/pattern details',
    example: 'Screen Printed',
  })
  @IsString()
  @IsOptional()
  garmentPRINT?: string;

  @ApiPropertyOptional({
    description: 'Country of manufacture',
    example: 'Bangladesh',
  })
  @IsString()
  @IsOptional()
  garmentMADeIN?: string;

  @ApiPropertyOptional({
    description: 'Care instructions for the garment',
    example: 'Machine wash cold',
  })
  @IsString()
  @IsOptional()
  garmentCARE?: string;

  @ApiPropertyOptional({
    description: 'Whether the product should appear on the home page',
    example: false,
    default: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  addHome?: boolean;

  @ApiPropertyOptional({
    description: 'Canadian price of the product',
    example: 39.99,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  ca_price?: number;
}
