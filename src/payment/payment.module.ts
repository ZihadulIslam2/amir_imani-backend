import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentRecord, PaymentSchema } from './paymentRecord';
import { PaymentQueueModule } from '../queues/payment-queue.module';
import { CartModule } from '../cart/cart.module';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentRecord.name, schema: PaymentSchema },
    ]),
    forwardRef(() => PaymentQueueModule),
    CartModule,
    EmailModule,
    UserModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
