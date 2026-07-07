import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { sendResponse } from '../common/utils/sendResponse';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Create or add items to a shopping cart' })
  @ApiResponse({ status: 201, description: 'Cart created or updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  async createCart(@Body() dto: CreateCartDto, @Res() res: Response) {
    // console.log('first', dto);
    const cart = await this.cartService.createCart(dto);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Cart created successfully',
      data: cart,
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Retrieve the active cart for a specific user' })
  @ApiParam({ name: 'userId', description: 'The MongoDB user ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Cart not found for user.' })
  async getCartByUserId(@Param('userId') userId: string, @Res() res: Response) {
    const cart = await this.cartService.getCartByUserId(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Cart retrieved successfully',
      data: cart,
    });
  }

  @Put('user/:userId')
  @ApiOperation({ summary: 'Update/override items in a user’s cart' })
  @ApiParam({ name: 'userId', description: 'The MongoDB user ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Cart updated successfully.' })
  async updateCart(
    @Param('userId') userId: string,
    @Body() dto: UpdateCartDto,
    @Res() res: Response,
  ) {
    const cart = await this.cartService.updateCart(userId, dto);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Cart updated successfully',
      data: cart,
    });
  }

  @Delete(':cartId')
  @ApiOperation({ summary: 'Delete a cart by its ID' })
  @ApiParam({ name: 'cartId', description: 'The MongoDB cart ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Cart deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Cart not found.' })
  async deleteCartById(@Param('cartId') cartId: string, @Res() res: Response) {
    const result = await this.cartService.deleteCartById(cartId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  }

  @Delete(':cartId/product/:productId')
  @ApiOperation({ summary: 'Remove a specific product from a cart' })
  @ApiParam({ name: 'cartId', description: 'The MongoDB cart ID', example: '60d21b4667d0d8992e610c85' })
  @ApiParam({ name: 'productId', description: 'The MongoDB product ID to remove', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Product removed from cart successfully.' })
  @ApiResponse({ status: 404, description: 'Cart or product not found.' })
  async deleteProductFromCart(
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
    @Res() res: Response,
  ) {
    const updatedCart = await this.cartService.deleteProductFromCart(
      cartId,
      productId,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product removed from cart successfully',
      data: updatedCart,
    });
  }
}
