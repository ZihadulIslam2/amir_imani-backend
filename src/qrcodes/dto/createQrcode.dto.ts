import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class createQrDto {
  @ApiProperty({ description: 'The name of the game associated with this QR code redirect', example: 'Mystic Tarot' })
  @IsNotEmpty({ message: 'gameName is required' })
  @IsString()
  gameName: string;

  @ApiProperty({ description: 'The final destination URL redirect target', example: 'https://example.com/play/mystic-tarot' })
  @IsNotEmpty({ message: 'finalUrl is required' })
  @IsUrl()
  finalUrl: string;
}
