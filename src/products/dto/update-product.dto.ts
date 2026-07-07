import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'The name of the product', example: 'Gold Tarot Card Deck' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({ description: 'The price of the product', example: 29.99 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ description: 'A short feature highlight of the product', example: 'Handmade, Premium Gold Foil' })
  @IsString()
  @IsOptional()
  feature?: string;

  @ApiPropertyOptional({ description: 'The detailed description of the product', example: 'A complete 78-card deck with gorgeous gold foil details and an instructional booklet.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'A video walkthrough link or demo link', example: 'https://youtube.com/watch?v=123' })
  @IsString()
  @IsOptional()
  videoLink?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Product images to upload (supports file upload or string URLs)',
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imgs?: string[];

  @ApiPropertyOptional({ description: 'Available colors for the product', example: ['gold', 'black'] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional({ description: 'Available sizes for the product', example: ['s', 'm', 'l'] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  size?: string[];

  @ApiPropertyOptional({ description: 'Stock quantity of the product', example: 100 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;
}
