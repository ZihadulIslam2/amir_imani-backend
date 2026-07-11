import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReviewStatus } from '../review.schema';

export class UpdateReviewStatusDto {
  @ApiProperty({
    description: 'Moderation status',
    enum: ReviewStatus,
    example: ReviewStatus.PUBLISHED,
  })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}
