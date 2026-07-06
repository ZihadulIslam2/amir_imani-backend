import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FortuneHistoryDocument = FortuneHistory & Document;

@Schema({ timestamps: true })
export class FortuneHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], required: true })
  symbols: string[];

  @Prop({ required: true })
  fortune: string;
}

export const FortuneHistorySchema = SchemaFactory.createForClass(FortuneHistory);
