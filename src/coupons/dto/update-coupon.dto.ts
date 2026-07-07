import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { DiscountType, CouponEligibility } from '../coupon.schema';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCouponDto {
  @ApiPropertyOptional({ description: 'The unique uppercase code of the coupon', example: 'SUMMER50' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'The type of discount (percentage or fixed amount)', enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ description: 'The value of the discount', example: 15.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Minimum order cart value required to use this coupon', example: 50.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum cap value for percentage discounts', example: 20.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountCap?: number;

  @ApiPropertyOptional({ description: 'Total number of times this coupon code can be redeemed globally', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Number of times a single user can redeem this coupon', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional({ description: 'Expiry date of the coupon', example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Target user eligibility category (all/first_time/specific)', enum: CouponEligibility, example: CouponEligibility.ALL })
  @IsOptional()
  @IsEnum(CouponEligibility)
  eligibility?: CouponEligibility;

  @ApiPropertyOptional({ description: 'List of specific MongoDB user IDs allowed if eligibility is specific', example: ['60d21b4667d0d8992e610c85'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleUsers?: string[];

  @ApiPropertyOptional({ description: 'Active state of the coupon', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
