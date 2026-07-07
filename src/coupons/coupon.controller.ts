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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create a new coupon (Admin only)' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
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
  @ApiBearerAuth('JWT-auth')
  @Put(':id')
  @ApiOperation({ summary: 'Update an existing coupon by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The MongoDB coupon ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
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
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The MongoDB coupon ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Coupon deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
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
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Retrieve list of all coupons (Admin only)' })
  @ApiQuery({ name: 'status', description: 'Filter by active/expired/all status', enum: ['active', 'expired', 'all'], required: false })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
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
  @ApiBearerAuth('JWT-auth')
  @Get('analytics')
  @ApiOperation({ summary: 'Retrieve analytics summary for coupons usage (Admin only)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
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
  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve details of a coupon by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The MongoDB coupon ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
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
  @ApiOperation({ summary: 'Validate a coupon code against a user cart total' })
  @ApiResponse({ status: 200, description: 'Validation query processed. Check response data for validity status.' })
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
  @ApiOperation({ summary: 'Apply a coupon to a purchase and calculate discount' })
  @ApiResponse({ status: 200, description: 'Coupon applied successfully. Returns discount details.' })
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
