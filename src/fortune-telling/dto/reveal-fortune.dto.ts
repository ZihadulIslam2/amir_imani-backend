import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class RevealFortuneDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  symbols: string[];
}
