import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/product.schema';
import { User, UserSchema } from '../user/user.schema';
import { Preorder, PreorderSchema } from './preorder.schema';
import { PreordersController } from './preorders.controller';
import { PreordersService } from './preorders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Preorder.name, schema: PreorderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PreordersController],
  providers: [PreordersService],
})
export class PreordersModule {}
