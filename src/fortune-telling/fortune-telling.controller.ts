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

@Controller('fortune-telling')
export class FortuneTellingController {
  constructor(private readonly fortuneTellingService: FortuneTellingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('reveal')
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
  @Get('my-history')
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
  @Get('admin/history')
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
