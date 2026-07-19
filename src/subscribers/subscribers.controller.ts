import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '../auth/decorators/role.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { sendResponse } from '../common/utils/sendResponse';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { NotifySubscribersDto } from './dto/notify-subscribers.dto';
import { SubscribersService } from './subscribers.service';

@ApiTags('Subscribers')
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post('newsletter')
  @ApiOperation({ summary: 'Subscribe a user or guest to newsletter updates' })
  @ApiBody({
    type: CreateSubscriberDto,
    description:
      'Newsletter form payload. Works for logged-in users and guests.',
    examples: {
      guest: {
        summary: 'Email-only newsletter subscription',
        value: {
          email: 'john.doe@example.com',
        },
      },
      withOptionalDetails: {
        summary: 'Subscription with optional game details',
        value: {
          email: 'john.doe@example.com',
          subscriberName: 'John Doe',
          game: 'Doundo Adventure',
          gameCategory: 'Action',
          releaseDate: '2026-12-31T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Subscriber saved successfully.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        message: 'Newsletter subscription saved successfully',
        data: {
          _id: '60d21b4667d0d8992e610c85',
          email: 'john.doe@example.com',
          subscriptionDate: '2026-07-19T08:30:00.000Z',
          status: 'Subscribed',
        },
      },
    },
  })
  async subscribe(@Body() dto: CreateSubscriberDto, @Res() res: Response) {
    const subscriber = await this.subscribersService.subscribe(dto);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Newsletter subscription saved successfully',
      data: subscriber,
    });
  }

  @Get('unsubscribe')
  @ApiOperation({
    summary: 'Unsubscribe from newsletter emails',
    description:
      'Public endpoint used by the unsubscribe link inside subscriber notification emails. It validates the signed token before marking the subscriber as Unsubscribed.',
  })
  @ApiQuery({
    name: 'email',
    description: 'Subscriber email address from the unsubscribe link',
    example: 'john.doe@example.com',
  })
  @ApiQuery({
    name: 'token',
    description: 'Signed unsubscribe token from the unsubscribe link',
    example: 'f9c1f6b2...',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriber unsubscribed successfully.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: 'You have been unsubscribed successfully.',
        data: {
          email: 'john.doe@example.com',
          status: 'Unsubscribed',
          message: 'You have been unsubscribed successfully.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid unsubscribe link or subscriber not found.',
  })
  async unsubscribe(
    @Query('email') email: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const result = await this.subscribersService.unsubscribe(email, token);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: result,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Get all newsletter subscribers (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Subscribers retrieved successfully.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: 'Subscribers retrieved successfully',
        data: [
          {
            _id: '60d21b4667d0d8992e610c85',
            subscriberName: 'John Doe',
            email: 'john.doe@example.com',
            game: 'Doundo Adventure',
            gameCategory: 'Action',
            subscriptionDate: '2026-07-19T08:30:00.000Z',
            releaseDate: '2026-12-31T00:00:00.000Z',
            status: 'Subscribed',
          },
        ],
      },
    },
  })
  async getAllSubscribers(@Res() res: Response) {
    const subscribers = await this.subscribersService.getAllSubscribers();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Subscribers retrieved successfully',
      data: subscribers,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth('JWT-auth')
  @Post('notify')
  @ApiOperation({
    summary: 'Publish an email notification to subscribers (Admin only)',
    description:
      'Sends the admin subject and message description to every subscriber with status Subscribed. Each email includes a signed unsubscribe link that points to GET /subscribers/unsubscribe.',
  })
  @ApiBody({
    type: NotifySubscribersDto,
    description:
      'Admin notification form. The publish action sends this subject and message to every subscribed email and includes an unsubscribe link in the email footer.',
    examples: {
      publish: {
        summary: 'Notify subscribers',
        value: {
          messageSubject: 'New Game Update Released',
          messageDescription:
            'We have published a new update for your subscribed game.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification published successfully.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: 'Subscriber notification published successfully',
        data: {
          totalSubscribers: 24,
          sent: 23,
          failed: 1,
          message: 'Subscriber notification published successfully',
        },
      },
    },
  })
  async notifySubscribers(
    @Body() dto: NotifySubscribersDto,
    @Res() res: Response,
  ) {
    const result = await this.subscribersService.notifySubscribers(dto);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: result,
    });
  }
}
