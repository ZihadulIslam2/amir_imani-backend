// product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductType {
  CARD = 'card',
  MARCHANDICE = 'marchandice',
}

export enum MerchandiseBadge {
  NONE = 'none',
  NEW_ARRIVAL = 'new_arrival',
  MOST_POPULAR = 'most_popular',
  BEST_SELLER = 'best_seller',
  LIMITED_EDITION = 'limited_edition',
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

// New interfaces for nested objects
export interface BoxNumber {
  number: string;
  title: string;
  subtitle: string;
}

export interface InTheBox {
  title: string;
  subtitle: string;
  boxnumbers: BoxNumber[];
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

  @Prop({
    type: String,
    enum: MerchandiseBadge,
    required: false,
  })
  merchandiseBadge?: MerchandiseBadge;

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

  @Prop()
  ruleTitle?: string;

  @Prop({ type: [{ type: Object }], required: false })
  rulls?: Record<string, any>[];

  @Prop()
  boardanatomyTitle?: string;

  @Prop()
  boardAnatomyDiscription?: string;

  @Prop()
  passandplayTittle?: string;

  @Prop({ type: [{ type: Object }], required: false })
  passandplay?: { message?: string; name?: string; type?: string }[];

  @Prop()
  garmentTitle?: string;

  @Prop()
  garmentsMATERIAL?: string;

  @Prop()
  garmentWEIGHT?: string;

  @Prop()
  garmentFit?: string;

  @Prop()
  garmentPRINT?: string;

  @Prop()
  garmentMADeIN?: string;

  @Prop()
  garmentCARE?: string;

  @Prop({ required: false, default: false })
  addHome?: boolean;

  @Prop({ required: false })
  ca_price?: number;

  // ============ NEW FIELDS ============

  @Prop({ type: [String], required: false })
  productFeatures?: string[];

  @Prop({ required: false })
  gameSubtitle?: string;

  @Prop({ required: false })
  players?: string;

  @Prop({ required: false })
  age?: string;

  @Prop({ required: false })
  minutes?: string;

  @Prop({ required: false })
  cards?: string;

  @Prop({ type: Object, required: false })
  inTheBox?: InTheBox;

  @Prop({ required: false })
  homeImage?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
