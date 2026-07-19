import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductType {
  CARD = 'card',
  MARCHANDICE = 'marchandice',
}

export enum ProductCategory {
  ALL = 'ALL',
  APPAREL = 'APPAREL',
  ACCESSORIES = 'ACCESSORIES',
  PRINTS_AND_POSTERS = 'PRINTS & POSTERS',
  STATIONERY = 'STATIONERY',
  HOME_AND_DECOR = 'HOME & DECOR',
  COLLECTIBLES = 'COLLECTIBLES',
}

export enum ProductSize {
  S = 's',
  M = 'm',
  L = 'l',
  XL = 'xl',
  XXL = 'xxl',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  price: number;

  @Prop({
    type: String,
    enum: ProductType,
    required: true,
  })
  productType: ProductType;

  @Prop({
    type: String,
    enum: ProductCategory,
    required: false,
  })
  category?: ProductCategory;

  @Prop({ required: true })
  feature: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  videoLink?: string;

  @Prop()
  imgs?: string[];

  @Prop({ type: [String], required: false })
  color?: string[];

  @Prop({ type: [String], required: false })
  size?: string[];

  @Prop({ required: false, default: 0 })
  quantity?: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
