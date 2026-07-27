import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreatePreorderDto {
  @ApiProperty({
    description: 'Product identifier to preorder',
    example: '6873d9ff0c5f1a1234567890',
  })
  @IsMongoId()
  productId: string;
}
