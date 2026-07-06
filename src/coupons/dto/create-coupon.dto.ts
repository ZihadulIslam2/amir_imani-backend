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

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountCap?: number;

  @IsNumber()
  @Min(1)
  usageLimit: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @IsDateString()
  expiryDate: string;

  @IsOptional()
  @IsEnum(CouponEligibility)
  eligibility?: CouponEligibility;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleUsers?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
