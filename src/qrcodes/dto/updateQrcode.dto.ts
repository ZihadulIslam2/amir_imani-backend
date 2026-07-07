import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class updateQrcodeDto {
  @ApiPropertyOptional({ description: 'The name of the game associated with this QR code redirect', example: 'Mystic Tarot' })
  @IsOptional()
  @IsString()
  gameName?: string;

  @ApiPropertyOptional({ description: 'The final destination URL redirect target', example: 'https://example.com/play/mystic-tarot' })
  @IsOptional()
  @IsUrl()
  finalUrl?: string; // only update redirect target
}
