import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'failed',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New fulfilment status for the order',
    enum: ORDER_STATUSES,
    example: 'completed',
  })
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;
}
