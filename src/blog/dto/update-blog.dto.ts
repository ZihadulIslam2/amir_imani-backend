import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBlogDto {
  @ApiPropertyOptional({ description: 'The title of the blog post', example: 'Understanding Tarot Symbolism' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'The rich text or markdown content of the blog post', example: 'Tarot cards contain deep archetypal symbols...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'The cover image of the blog post (file upload or image URL)',
  })
  @IsString()
  @IsOptional()
  img?: string;
}
