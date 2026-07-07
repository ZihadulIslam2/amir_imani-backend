import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogDto {
  @ApiProperty({ description: 'The title of the blog post', example: 'Understanding Tarot Symbolism' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'The rich text or markdown content of the blog post', example: 'Tarot cards contain deep archetypal symbols...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'The cover image of the blog post (file upload or image URL)',
  })
  @IsString()
  @IsOptional()
  img?: string;
}
