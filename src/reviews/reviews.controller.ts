import {
  Body,
  Controller,
  Delete,
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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { sendResponse } from '../common/utils/sendResponse';
import { Public } from '../common/decorators/public.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get published reviews for a product' })
  @ApiParam({ name: 'productId', description: 'The MongoDB product ID' })
  @ApiResponse({ status: 200, description: 'Product reviews retrieved successfully.' })
  async getProductReviews(
    @Param('productId') productId: string,
    @Res() res: Response,
  ) {
    const data = await this.reviewsService.getProductReviews(productId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product reviews retrieved successfully',
      data,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('eligibility/:productId')
  @ApiOperation({ summary: 'Check whether the current user can review a product' })
  async getReviewEligibility(
    @Param('productId') productId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { userId: string };
    const data = await this.reviewsService.getReviewEligibility(
      productId,
      user.userId,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Review eligibility retrieved successfully',
      data,
    });
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a review for a product' })
  async createReview(
    @Body() dto: CreateReviewDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { userId?: string } | undefined;
    const review = await this.reviewsService.createReview(dto, user?.userId);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Get all reviews for admin moderation' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getAllReviews(
    @Req() req: Request,
    @Query('search') search: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const user = req.user as { userId: string; role: string };
    const reviews = await this.reviewsService.getAllReviews(user, search, status);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Reviews retrieved successfully',
      data: reviews,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch(':reviewId/status')
  @ApiOperation({ summary: 'Update a review moderation status' })
  async updateReviewStatus(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewStatusDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { userId: string; role: string };
    const review = await this.reviewsService.updateReviewStatus(
      user,
      reviewId,
      dto,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Review status updated successfully',
      data: review,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete(':reviewId')
  @ApiOperation({ summary: 'Delete a review' })
  async deleteReview(
    @Param('reviewId') reviewId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { userId: string; role: string };
    const result = await this.reviewsService.deleteReview(user, reviewId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  }
}
