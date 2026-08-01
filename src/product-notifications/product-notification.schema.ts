import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductNotificationDocument = ProductNotification & Document;

@Schema({ timestamps: true })
export class ProductNotification {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  userName?: string;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ trim: true })
  productImage?: string;
}

export const ProductNotificationSchema =
  SchemaFactory.createForClass(ProductNotification);
ProductNotificationSchema.index({ productId: 1, email: 1 }, { unique: true });
