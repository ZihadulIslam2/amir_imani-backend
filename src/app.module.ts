import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { ContactUsModule } from './contact-us/contact-us.module';
import { QrcodesModule } from './qrcodes/qrcodes.module';
import { ProductsModule } from './products/products.module';
import { PaymentModule } from './payment/payment.module';
import { CartModule } from './cart/cart.module';
import { BullModule } from '@nestjs/bullmq';
import { BlogModule } from './blog/blog.module';
import { QueuesModule } from './queues/queues.module';
import { ShippingModule } from './shipping/shipping.module';
import { FortuneTellingModule } from './fortune-telling/fortune-telling.module';
import { CouponModule } from './coupons/coupon.module';
import { CustomerModule } from './customers/customer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRoot({
      connection: {
        host: '127.0.0.1',
        port: 6379,
      },
    }),
    QueuesModule,
    UserModule,
    AuthModule,
    EmailModule,
    ContactUsModule,
    QrcodesModule,
    ProductsModule,
    CartModule,
    PaymentModule,
    BlogModule,
    ShippingModule,
    FortuneTellingModule,
    CouponModule,
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
