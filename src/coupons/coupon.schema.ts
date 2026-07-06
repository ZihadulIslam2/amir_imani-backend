import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponDocument = Coupon & Document;

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum CouponEligibility {
  ALL = 'all',
  FIRST_TIME = 'first_time',
  SPECIFIC = 'specific',
}

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true })
  code: string;

  @Prop({ required: true, enum: DiscountType })
  discountType: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ min: 0, default: 0 })
  minOrderAmount: number;

  @Prop({ min: 0 })
  maxDiscountCap: number;

  @Prop({ required: true, min: 1 })
  usageLimit: number;

  @Prop({ min: 1, default: 1 })
  perUserLimit: number;

  @Prop({ default: 0, min: 0 })
  usedCount: number;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop({
    required: true,
    enum: CouponEligibility,
    default: CouponEligibility.ALL,
  })
  eligibility: CouponEligibility;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  eligibleUsers: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
