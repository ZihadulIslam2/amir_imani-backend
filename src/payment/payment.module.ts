import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentRecord, PaymentSchema } from './paymentRecord';
import { CartModule } from '../cart/cart.module';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';
import { ShippingModule } from '../shipping/shipping.module';
import { CouponModule } from '../coupons/coupon.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentRecord.name, schema: PaymentSchema },
    ]),
    CartModule,
    EmailModule,
    UserModule,
    ShippingModule,
    CouponModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
