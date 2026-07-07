import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/decorators/role.decorator';
import { sendResponse } from '../common/utils/sendResponse';
import { FortuneTellingService } from './fortune-telling.service';
import { RevealFortuneDto } from './dto/reveal-fortune.dto';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Fortune Telling')
@Controller('fortune-telling')
export class FortuneTellingController {
  constructor(private readonly fortuneTellingService: FortuneTellingService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('reveal')
  @ApiOperation({ summary: 'Reveal a new fortune based on 3 selected symbols' })
  @ApiResponse({ status: 200, description: 'Fortune revealed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async reveal(
    @Body() dto: RevealFortuneDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.userId;
    const result = await this.fortuneTellingService.reveal(userId, dto.symbols);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Fortune revealed successfully',
      data: result,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('my-history')
  @ApiOperation({ summary: 'Retrieve logged-in user’s fortune telling history' })
  @ApiResponse({ status: 200, description: 'Fortune history retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyHistory(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.userId;
    const history = await this.fortuneTellingService.getUserHistory(userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Fortune history retrieved successfully',
      data: history,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Get('admin/history')
  @ApiOperation({ summary: 'Retrieve all fortune telling history (Admin only)' })
  @ApiResponse({ status: 200, description: 'All fortune history retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
  async getAllHistory(@Res() res: Response) {
    const history = await this.fortuneTellingService.getAllHistory();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'All fortune history retrieved successfully',
      data: history,
    });
  }
}
