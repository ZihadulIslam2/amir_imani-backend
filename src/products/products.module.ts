import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './product.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CartModule } from '../cart/cart.module';
import { Cart, CartSchema } from '../cart/cart.schema';
import { PaymentRecord, PaymentSchema } from '../payment/paymentRecord';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Cart.name, schema: CartSchema },
      { name: PaymentRecord.name, schema: PaymentSchema },
    ]),
    CloudinaryModule,
    CartModule,
    BullModule.registerQueue({
      name: 'product-notification',
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
