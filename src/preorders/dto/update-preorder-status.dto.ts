import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PreorderStatus } from '../preorder.schema';

export class UpdatePreorderStatusDto {
  @ApiProperty({
    description: 'Updated preorder status',
    enum: PreorderStatus,
    example: PreorderStatus.COMPLETED,
  })
  @IsEnum(PreorderStatus)
  status: PreorderStatus;
}
