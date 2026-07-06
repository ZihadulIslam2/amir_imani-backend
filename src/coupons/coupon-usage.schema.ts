import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponUsageDocument = CouponUsage & Document;

@Schema({ timestamps: true })
export class CouponUsage {
  @Prop({ type: Types.ObjectId, ref: 'Coupon', required: true })
  couponId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PaymentRecord' })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  discountAmount: number;

  @Prop({ default: Date.now })
  usedAt: Date;
}

export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);
