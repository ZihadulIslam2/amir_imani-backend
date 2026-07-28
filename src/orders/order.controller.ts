import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/decorators/role.decorator';
import { sendResponse } from '../common/utils/sendResponse';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Retrieve order history for a user' })
  @ApiParam({ name: 'userId', description: 'The MongoDB user ID' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully.' })
  async getOrdersForUser(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const orders = await this.orderService.getOrdersForUser(userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User orders retrieved successfully',
      data: orders,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Retrieve paginated list of all orders (Admin only)' })
  @ApiQuery({ name: 'page', description: 'Page number (default: 1)', required: false, type: Number })
  @ApiQuery({ name: 'limit', description: 'Orders per page (default: 10)', required: false, type: Number })
  @ApiQuery({ name: 'search', description: 'Search order ID, customer or product', required: false })
  @ApiQuery({ name: 'orderStatus', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'startDate', description: 'YYYY-MM-DD', required: false })
  @ApiQuery({ name: 'endDate', description: 'YYYY-MM-DD', required: false })
  @ApiQuery({ name: 'sort', enum: ['asc', 'desc'], required: false })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
  async getAllOrders(
    @Res() res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sort') sort?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '10', 10) || 10));
    const result = await this.orderService.getAllOrders(pageNum, limitNum, {
      search,
      orderStatus,
      paymentStatus,
      startDate,
      endDate,
      sort: sort === 'asc' ? 'asc' : 'desc',
    });
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Orders retrieved successfully',
      data: result,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Update an order status (Admin only)' })
  @ApiParam({ name: 'orderId', description: 'The MongoDB order ID' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({ status: 200, description: 'Order status updated successfully.' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @Res() res: Response,
  ) {
    const order = await this.orderService.updateOrderStatus(orderId, dto.status);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  }
}
