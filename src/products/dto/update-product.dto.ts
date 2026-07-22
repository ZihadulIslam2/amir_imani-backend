// update-product.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MerchandiseBadge,
  ProductCategory,
  ProductType,
} from '../product.schema';

const parseOptionalArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  return undefined;
};

const parseOptionalObject = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  return undefined;
};

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'The name of the product',
    example: 'Gold Tarot Card Deck',
  })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({
    description: 'The price of the product',
    example: 29.99,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    description: 'A short feature highlight of the product',
    example: 'Handmade, Premium Gold Foil',
  })
  @IsString()
  @IsOptional()
  feature?: string;

  @ApiPropertyOptional({
    description: 'The detailed description of the product',
    example:
      'A complete 78-card deck with gorgeous gold foil details and an instructional booklet.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'A video walkthrough link or demo link',
    example: 'https://youtube.com/watch?v=123',
  })
  @IsString()
  @IsOptional()
  videoLink?: string;

  @ApiPropertyOptional({
    description: 'The type category of the product (card/merchandise)',
    enum: ProductType,
    example: ProductType.MARCHANDICE,
  })
  @IsEnum(ProductType, {
    message: 'Product type must be card or marchandice',
  })
  @IsOptional()
  productType?: ProductType;

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
    example: MerchandiseBadge.MOST_POPULAR,
  })
  @IsEnum(MerchandiseBadge, {
    message: 'Invalid merchandise badge',
  })
  @IsOptional()
  merchandiseBadge?: MerchandiseBadge;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Product images to upload (supports file upload or string URLs)',
  })
  @Transform(parseOptionalArray)
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imgs?: string[];

  @ApiPropertyOptional({
    description: 'Existing image URLs to retain while uploading new files',
    example: ['https://example.com/image.png'],
  })
  @Transform(parseOptionalArray)
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  existingImgs?: string[];

  @ApiPropertyOptional({
    description: 'Available colors for the product',
    example: ['gold', 'black'],
  })
  @Transform(parseOptionalArray)
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional({
    description: 'Available sizes for the product',
    example: ['s', 'm', 'l'],
  })
  @Transform(parseOptionalArray)
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  size?: string[];

  @ApiPropertyOptional({
    description: 'Stock quantity of the product',
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
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
  @Transform(parseOptionalArray)
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
  @Transform(parseOptionalArray)
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

  // ============ NEW FIELDS ============

  @ApiPropertyOptional({
    description: 'Product features array',
    example: [
      { name: 'Strategy', value: 'High' },
      { name: 'Luck', value: 'Medium' },
    ],
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'string' },
      },
    },
  })
  @Transform(parseOptionalArray)
  @IsArray()
  @IsOptional()
  productFeatures?: Record<string, any>[];

  @ApiPropertyOptional({
    description: 'Game subtitle',
    example: "The World's Most Popular Board Game",
  })
  @IsString()
  @IsOptional()
  gameSubtitle?: string;

  @ApiPropertyOptional({
    description: 'Number of players',
    example: '2-6',
  })
  @IsString()
  @IsOptional()
  players?: string;

  @ApiPropertyOptional({
    description: 'Age range for the game',
    example: '8+',
  })
  @IsString()
  @IsOptional()
  age?: string;

  @ApiPropertyOptional({
    description: 'Game duration in minutes',
    example: '60-180',
  })
  @IsString()
  @IsOptional()
  minutes?: string;

  @ApiPropertyOptional({
    description: 'Number of cards',
    example: '32',
  })
  @IsString()
  @IsOptional()
  cards?: string;

  @ApiPropertyOptional({
    description: "What's in the box section",
    example: {
      title: "What's Included",
      subtitle: 'Everything you need to play',
      boxnumbers: [
        { number: '1', title: 'Game Board', subtitle: 'Foldable board' },
        { number: '2', title: 'Cards', subtitle: '32 property cards' },
      ],
    },
  })
  @Transform(parseOptionalObject)
  @IsObject()
  @IsOptional()
  inTheBox?: {
    title?: string;
    subtitle?: string;
    boxnumbers?: { number?: string; title?: string; subtitle?: string }[];
  };

  @ApiPropertyOptional({
    description: 'Home image URL',
    example: 'https://example.com/home-image.jpg',
  })
  @IsString()
  @IsOptional()
  homeImage?: string;
}
