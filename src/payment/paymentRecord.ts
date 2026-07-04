import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = PaymentRecord & Document;

@Schema({ _id: false })
class ShippingAddress {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  province: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop({ required: true })
  country: string;
}

@Schema({ _id: false })
class PurchasedItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  color?: string;

  @Prop()
  size?: string;
}

@Schema({ timestamps: true })
export class PaymentRecord {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  itemIds: string[];

  @Prop()
  seasonId: string;

  @Prop()
  paymentIntent: string;

  @Prop({ default: 'pending' })
  paymentStatus: string;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: String, default: 'usd' })
  currency: string;

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  shippingCost: number;

  @Prop({ type: [PurchasedItem], default: [] })
  items: PurchasedItem[];

  @Prop({ type: ShippingAddress })
  shippingAddress: ShippingAddress;

  @Prop({ default: 'pending' })
  orderStatus: string;
}

export const PaymentSchema = SchemaFactory.createForClass(PaymentRecord);
