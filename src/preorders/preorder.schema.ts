import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PreorderDocument = Preorder & Document;

export enum PreorderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Preorder {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, trim: true })
  userName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  userEmail: string;

  @Prop({ trim: true })
  productType?: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({
    type: String,
    enum: PreorderStatus,
    default: PreorderStatus.PENDING,
  })
  status: PreorderStatus;
}

export const PreorderSchema = SchemaFactory.createForClass(Preorder);

PreorderSchema.index({ userId: 1, productId: 1 }, { unique: true });
