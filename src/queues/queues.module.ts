import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductNotificationProcessor } from './product-notification.processor';
import { EmailModule } from '../email/email.module';
import { Email, EmailSchema } from '../email/email.schema';

@Module({
  imports: [
    forwardRef(() => EmailModule),
    MongooseModule.forFeature([{ name: Email.name, schema: EmailSchema }]),
    BullModule.registerQueue({
      name: 'product-notification',
    }),
  ],
  providers: [ProductNotificationProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
