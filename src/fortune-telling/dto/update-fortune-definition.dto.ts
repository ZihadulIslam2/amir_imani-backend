import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateFortuneDefinitionDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Updated symbol combination for this fortune entry',
    example: ['SHAMAN', 'ENKI', 'HERA'],
    minItems: 3,
    maxItems: 3,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  symbols?: string[];

  @ApiPropertyOptional({
    description: 'Updated fortune text',
    example: 'A new insight unfolds for this symbol combination.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fortune?: string;
}
