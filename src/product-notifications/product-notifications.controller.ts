import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/decorators/role.decorator';
import { sendResponse } from '../common/utils/sendResponse';
import { CreateProductNotificationDto } from './dto/create-product-notification.dto';
import { ProductNotificationsService } from './product-notifications.service';

@ApiTags('Product notifications')
@Controller('product-notifications')
export class ProductNotificationsController {
  constructor(private readonly service: ProductNotificationsService) {}

  @Post()
  async create(
    @Body() dto: CreateProductNotificationDto,
    @Res() res: Response,
  ) {
    const notification = await this.service.create(dto);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'We will notify you when this product is available.',
      data: notification,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Get()
  async getAll(@Res() res: Response) {
    const notifications = await this.service.getAll();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product notifications retrieved successfully',
      data: notifications,
    });
  }
}
