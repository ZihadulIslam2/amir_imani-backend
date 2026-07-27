import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/decorators/role.decorator';
import { sendResponse } from '../common/utils/sendResponse';
import { CreatePreorderDto } from './dto/create-preorder.dto';
import { UpdatePreorderStatusDto } from './dto/update-preorder-status.dto';
import { PreordersService } from './preorders.service';

@ApiTags('Preorders')
@Controller('preorders')
export class PreordersController {
  constructor(private readonly preordersService: PreordersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create a preorder for the authenticated user' })
  @ApiBody({ type: CreatePreorderDto })
  @ApiResponse({ status: 201, description: 'Preorder created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createPreorder(
    @Req() req: Request,
    @Body() dto: CreatePreorderDto,
    @Res() res: Response,
  ) {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    const preorder = await this.preordersService.createPreorder(userId ?? '', dto.productId);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Preorder submitted successfully',
      data: preorder,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Retrieve all preorders (Admin only)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Preorders retrieved successfully.' })
  async getAllPreorders(
    @Query('search') search: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const preorders = await this.preordersService.getAllPreorders(search, status);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Preorders retrieved successfully',
      data: preorders,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Patch(':preorderId/status')
  @ApiOperation({ summary: 'Update preorder status (Admin only)' })
  @ApiBody({ type: UpdatePreorderStatusDto })
  @ApiResponse({ status: 200, description: 'Preorder status updated successfully.' })
  async updatePreorderStatus(
    @Param('preorderId') preorderId: string,
    @Body() dto: UpdatePreorderStatusDto,
    @Res() res: Response,
  ) {
    const preorder = await this.preordersService.updatePreorderStatus(
      preorderId,
      dto.status,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Preorder status updated successfully',
      data: preorder,
    });
  }
}
