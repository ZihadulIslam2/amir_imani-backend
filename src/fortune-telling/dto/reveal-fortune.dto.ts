import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevealFortuneDto {
  @ApiProperty({
    type: [String],
    description: 'Array of exactly 3 symbol strings representing chosen cards/symbols',
    example: ['symbol1', 'symbol2', 'symbol3'],
    minItems: 3,
    maxItems: 3,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  symbols: string[];
}
