import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './cart.schema';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<CartDocument>) {}

  async createCart(dto: CreateCartDto): Promise<Cart> {
    // console.log('first', dto);
    try {
      const userId = new Types.ObjectId(dto.userId);
      const newItems = dto.productIds.map((item) => ({
        productId: new Types.ObjectId(item.productId),
        quantity: item.quantity,
        color: item.color,
        size: item.size,
      }));

      // Check if cart already exists for this user
      const existingCart = await this.cartModel.findOne({ userId }).exec();

      if (existingCart) {
        console.log('new items_', newItems);

        // Process each new item
        newItems.forEach((newItem) => {
          // Find if the same product with same color and size already exists
          const existingItemIndex = existingCart.productIds.findIndex(
            (item) =>
              item.productId.toString() === newItem.productId.toString() &&
              item.color === newItem.color &&
              item.size === newItem.size,
          );

          if (existingItemIndex !== -1) {
            // Product exists, increment quantity
            existingCart.productIds[existingItemIndex].quantity +=
              newItem.quantity;
          } else {
            // Product doesn't exist, add as new item
            existingCart.productIds.push(newItem);
          }
        });

        return await existingCart.save();
      }

      // Create new cart if it doesn't exist
      const newCart = new this.cartModel({
        userId,
        productIds: newItems,
      });

      return await newCart.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create cart');
    }
  }

  async getCartByUserId(userId: string): Promise<Cart> {
    const cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('productIds.productId')
      .exec();

    if (!cart) {
      throw new NotFoundException(`Cart not found for user ${userId}`);
    }

    return cart;
  }

  async updateCart(userId: string, dto: UpdateCartDto): Promise<Cart> {
    try {
      const updatedCart = await this.cartModel
        .findOneAndUpdate(
          { userId: new Types.ObjectId(userId) },
          {
            productIds: dto.productIds.map((item) => ({
              productId: new Types.ObjectId(item.productId),
              quantity: item.quantity,
              color: item.color,
              size: item.size,
            })),
          },
          { new: true },
        )
        .populate('productIds.productId')
        .exec();

      if (!updatedCart) {
        throw new NotFoundException(`Cart not found for user ${userId}`);
      }

      return updatedCart;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update cart');
    }
  }

  async deleteCartById(cartId: string): Promise<{ message: string }> {
    const result = await this.cartModel
      .findByIdAndDelete(new Types.ObjectId(cartId))
      .exec();

    if (!result) {
      throw new NotFoundException(`Cart not found for id ${cartId}`);
    }

    return { message: 'Cart deleted successfully' };
  }

  async deleteProductFromCart(
    cartId: string,
    productId: string,
  ): Promise<Cart> {
    try {
      const updatedCart = await this.cartModel
        .findByIdAndUpdate(
          new Types.ObjectId(cartId),
          {
            $pull: {
              productIds: {
                productId: new Types.ObjectId(productId),
              },
            },
          },
          { new: true },
        )
        .populate('productIds.productId')
        .exec();

      if (!updatedCart) {
        throw new NotFoundException(`Cart not found for id ${cartId}`);
      }

      return updatedCart;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete product from cart');
    }
  }

  async deleteProductFromAllCarts(productId: string): Promise<void> {
    try {
      await this.cartModel.updateMany(
        {},
        {
          $pull: {
            productIds: {
              productId: new Types.ObjectId(productId),
            },
          },
        },
      );
    } catch (error) {
      throw new BadRequestException('Failed to remove product from carts');
    }
  }
}
