import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { ProductNotificationProcessor } from './product-notification.processor';
import { EmailModule } from '../email/email.module';
import { SubscribersModule } from '../subscribers/subscribers.module';

@Module({
  imports: [
    forwardRef(() => EmailModule),
    SubscribersModule,
    BullModule.registerQueue({
      name: 'product-notification',
    }),
  ],
  providers: [ProductNotificationProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
