import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriberDocument = Subscriber & Document;

export enum SubscriberStatus {
  SUBSCRIBED = 'Subscribed',
  UNSUBSCRIBED = 'Unsubscribed',
}

@Schema({ timestamps: true })
export class Subscriber {
  @Prop({ trim: true })
  subscriberName?: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  game?: string;

  @Prop({ trim: true })
  gameCategory?: string;

  @Prop({ type: Date, default: Date.now })
  subscriptionDate: Date;

  @Prop({ type: Date })
  releaseDate?: Date;

  @Prop({
    type: String,
    enum: SubscriberStatus,
    default: SubscriberStatus.SUBSCRIBED,
  })
  status: SubscriberStatus;
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);
