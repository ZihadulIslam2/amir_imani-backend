import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { sendResponse } from '../common/utils/sendResponse';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('intent')
  @ApiOperation({ summary: 'Create a new Stripe payment intent' })
  @ApiBody({ type: CreatePaymentIntentDto, description: 'Guest checkout example (omit userId, provide email + items). For registered users, provide userId and omit email/items (cart is read from DB).', examples: { 'guest': { summary: 'Guest checkout', value: { email: 'guest@example.com', firstName: 'Jane', lastName: 'Doe', shippingAddress: { street: '123 Main St', city: 'Toronto', province: 'ON', postalCode: 'M5V 2T6', country: 'Canada' }, items: [{ productId: '60d21b4667d0d8992e610c85', quantity: 2, color: 'gold', size: 'm' }], currency: 'cad', couponCode: 'SUMMER20' } }, 'registered': { summary: 'Registered user (cart-based)', value: { userId: '664f1a2b3c4d5e6f7a8b9c0d', shippingAddress: { street: '123 Main St', city: 'Toronto', province: 'ON', postalCode: 'M5V 2T6', country: 'Canada' }, currency: 'usd', couponCode: 'WELCOME10' } } } })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully.', schema: { example: { statusCode: 201, success: true, message: 'Payment intent created successfully', data: { clientSecret: 'pi_3R7sP9LkdIwJn9wI1xH3zJ9A_secret_o4BKL3cT8R7sP9LkdIwJn9wI', paymentId: '664f1a2b3c4d5e6f7a8b9c0d', coupon: { couponId: '664f1a2b3c4d5e6f7a8b9c0e', discountAmount: 10.00 } } } } })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress;

    const result = await this.paymentService.createPaymentIntent(dto, clientIp);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Payment intent created successfully',
      data: result,
    });
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe Webhook handler for processing events asynchronously' })
  @ApiResponse({ status: 200, description: 'Webhook received and processed.' })
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody as Buffer;

    await this.paymentService.handleWebhook(rawBody, signature);

    res.json({ received: true });
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retrieve list of all payment records' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully.' })
  async getAllPayments(@Res() res: Response) {
    const payments = await this.paymentService.getAllPayments();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payments retrieved successfully',
      data: payments,
    });
  }

  @ApiBearerAuth('JWT-auth')
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all payment records for a specific user' })
  @ApiParam({ name: 'userId', description: 'The MongoDB user ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'User payments retrieved successfully.' })
  async getPaymentsByUser(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const payments = await this.paymentService.getPaymentsByUser(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User payments retrieved successfully',
      data: payments,
    });
  }

  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve details of a single payment record' })
  @ApiParam({ name: 'id', description: 'The MongoDB payment record ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Payment record not found.' })
  async getPayment(@Param('id') id: string, @Res() res: Response) {
    const payment = await this.paymentService.getPaymentById(id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payment retrieved successfully',
      data: payment,
    });
  }
}
