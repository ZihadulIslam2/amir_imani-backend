import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/decorators/role.decorator';
import { sendResponse } from '../common/utils/sendResponse';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Post()
  async createCoupon(@Body() dto: CreateCouponDto, @Res() res: Response) {
    const coupon = await this.couponService.createCoupon(dto);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Put(':id')
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @Res() res: Response,
  ) {
    const coupon = await this.couponService.updateCoupon(id, dto);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Delete(':id')
  async deleteCoupon(@Param('id') id: string, @Res() res: Response) {
    const result = await this.couponService.deleteCoupon(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Get()
  async getAllCoupons(@Res() res: Response, @Query('status') status?: string) {
    const validStatuses = ['active', 'expired', 'all'] as const;
    const filter = validStatuses.includes(
      status as 'active' | 'expired' | 'all',
    )
      ? (status as 'active' | 'expired' | 'all')
      : undefined;
    const coupons = await this.couponService.getAllCoupons(filter);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Coupons retrieved successfully',
      data: coupons,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Get('analytics')
  async getAnalytics(@Res() res: Response) {
    const analytics = await this.couponService.getCouponAnalytics();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Analytics retrieved successfully',
      data: analytics,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Get(':id')
  async getCouponById(@Param('id') id: string, @Res() res: Response) {
    const coupon = await this.couponService.getCouponById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Coupon retrieved successfully',
      data: coupon,
    });
  }

  @Post('validate')
  async validateCoupon(@Body() dto: ValidateCouponDto, @Res() res: Response) {
    const result = await this.couponService.validateCoupon(dto);
    sendResponse(res, {
      statusCode: 200,
      success: result.valid,
      message: result.message,
      data: result.data,
    });
  }

  @Post('apply')
  async applyCoupon(@Body() dto: ValidateCouponDto, @Res() res: Response) {
    const result = await this.couponService.applyCoupon(dto);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: { discountAmount: result.discountAmount },
    });
  }
}
