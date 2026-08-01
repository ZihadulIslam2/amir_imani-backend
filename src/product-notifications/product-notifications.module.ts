import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/product.schema';
import { User, UserSchema } from '../user/user.schema';
import {
  ProductNotification,
  ProductNotificationSchema,
} from './product-notification.schema';
import { ProductNotificationsController } from './product-notifications.controller';
import { ProductNotificationsService } from './product-notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductNotification.name, schema: ProductNotificationSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ProductNotificationsController],
  providers: [ProductNotificationsService],
})
export class ProductNotificationsModule {}
