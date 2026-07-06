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

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('intent')
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
  async getAllPayments(@Res() res: Response) {
    const payments = await this.paymentService.getAllPayments();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payments retrieved successfully',
      data: payments,
    });
  }

  @Get('user/:userId')
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

  @Get(':id')
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
