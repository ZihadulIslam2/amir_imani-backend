import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FortuneDefinitionDocument = FortuneDefinition & Document;

@Schema({ timestamps: true })
export class FortuneDefinition {
  @Prop({ required: true, unique: true, index: true })
  combinationKey: string;

  @Prop({ type: [String], required: true })
  symbols: string[];

  @Prop({ required: true })
  fortune: string;

  @Prop({ required: true, index: true })
  sequence: number;
}

export const FortuneDefinitionSchema =
  SchemaFactory.createForClass(FortuneDefinition);
