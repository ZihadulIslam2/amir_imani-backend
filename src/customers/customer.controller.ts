import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CustomerService } from './customer.service';
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
} from '@nestjs/swagger';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Retrieve paginated list of all customers (Admin only)' })
  @ApiQuery({ name: 'status', description: 'Filter by active/blocked status', enum: ['active', 'blocked'], required: false })
  @ApiQuery({ name: 'page', description: 'Page number (default: 1)', required: false, type: Number })
  @ApiQuery({ name: 'limit', description: 'Customers per page (default: 10)', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
  async getAllCustomers(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const validStatuses = ['active', 'blocked'] as const;
    const filter = validStatuses.includes(status as 'active' | 'blocked')
      ? (status as 'active' | 'blocked')
      : undefined;
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '10', 10) || 10));
    const result = await this.customerService.getAllCustomers(filter, pageNum, limitNum);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Customers retrieved successfully',
      data: result,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update customer status (active/blocked) - Admin only' })
  @ApiParam({ name: 'id', description: 'The MongoDB user ID', example: '60d21b4667d0d8992e610c85' })
  @ApiQuery({ name: 'status', description: 'New status value', enum: ['active', 'blocked'], required: true })
  @ApiResponse({ status: 200, description: 'Customer status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid status value.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async updateCustomerStatus(
    @Param('id') id: string,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const result = await this.customerService.updateCustomerStatus(id, status);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Customer status updated successfully',
      data: result,
    });
  }
}
