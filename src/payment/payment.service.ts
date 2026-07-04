import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import * as geoip from 'geoip-lite';
import { PaymentRecord, PaymentDocument } from './paymentRecord';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CartService } from '../cart/cart.service';
import { ShippingService } from '../shipping/shipping.service';
import { EmailService } from '../email/email.service';
import { User } from '../user/user.schema';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    @InjectModel(PaymentRecord.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly cartService: CartService,
    private readonly shippingService: ShippingService,
    private readonly emailService: EmailService,
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables. Please add it to your .env file.',
      );
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
    });
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto, clientIp?: string) {
    // 1. Fetch the user's cart with populated products
    let cart;
    try {
      cart = await this.cartService.getCartByUserId(dto.userId);
    } catch {
      throw new BadRequestException('Cart not found');
    }

    if (!cart.productIds || cart.productIds.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Determine currency: shipping country → geo-IP fallback → default USD
    const country = dto.shippingAddress.country.toUpperCase();
    let currency = dto.currency;

    if (!currency) {
      if (country === 'CA') {
        currency = 'cad';
      } else if (country === 'US') {
        currency = 'usd';
      } else if (clientIp) {
        const geo = geoip.lookup(clientIp);
        if (geo && geo.country === 'CA') {
          currency = 'cad';
        } else {
          currency = 'usd';
        }
      } else {
        currency = 'usd';
      }
    }

    // 3. Calculate subtotal from cart items (prices are in USD)
    const items: Array<{
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      color?: string;
      size?: string;
    }> = [];

    let subtotalUsd = 0;

    for (const cartItem of cart.productIds) {
      const product = cartItem.productId as unknown as {
        _id: string;
        productName: string;
        price: number;
      };
      if (!product || !product.price) continue;

      const price = product.price;
      const quantity = cartItem.quantity;

      items.push({
        productId: product._id.toString(),
        productName: product.productName,
        price,
        quantity,
        color: cartItem.color,
        size: cartItem.size,
      });

      subtotalUsd += price * quantity;
    }

    if (items.length === 0) {
      throw new BadRequestException('No valid products in cart');
    }

    // 4. Calculate shipping cost
    const exchangeRate = parseFloat(
      process.env.CAD_EXCHANGE_RATE || '1.44',
    );

    const shipping = this.shippingService.calculateShipping(
      country,
      subtotalUsd,
    );

    const shippingCost = shipping.cost;

    // 5. Calculate total in the target currency
    const subtotalInCurrency =
      currency === 'cad' ? subtotalUsd * exchangeRate : subtotalUsd;

    const shippingInCurrency =
      shipping.currency === currency
        ? shippingCost
        : currency === 'cad'
          ? shippingCost * exchangeRate
          : shippingCost / exchangeRate;

    const total = Math.round(
      (subtotalInCurrency + shippingInCurrency) * 100,
    );

    // 6. Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: total,
      currency,
      metadata: {
        userId: dto.userId,
      },
      shipping: {
        name: '',
        address: {
          line1: dto.shippingAddress.street,
          city: dto.shippingAddress.city,
          state: dto.shippingAddress.province,
          postal_code: dto.shippingAddress.postalCode,
          country: dto.shippingAddress.country,
        },
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // 7. Save PaymentRecord with full order snapshot
    const payment = await this.paymentModel.create({
      userId: dto.userId,
      itemIds: [cart._id.toString()],
      paymentIntent: paymentIntent.id,
      totalAmount: total / 100,
      currency: paymentIntent.currency,
      subtotal: subtotalInCurrency,
      shippingCost: shippingInCurrency,
      items,
      shippingAddress: dto.shippingAddress,
      paymentStatus: 'pending',
      orderStatus: 'pending',
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentSuccess(intent);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentFailure(intent);
    }
  }

  private async handlePaymentSuccess(intent: Stripe.PaymentIntent) {
    const payment = await this.paymentModel.findOne({
      paymentIntent: intent.id,
    });

    if (!payment || payment.paymentStatus === 'paid') return;

    payment.paymentStatus = 'paid';
    payment.orderStatus = 'processing';
    await payment.save();

    // Send confirmation email
    try {
      const user = await this.userModel.findById(payment.userId);
      if (user) {
        const confirmationHtml = this.buildConfirmationHtml(
          user.firstName,
          user.lastName,
          payment,
        );

        await this.emailService.sendPaymentConfirmationEmail(
          user.email,
          user.firstName,
          payment.totalAmount,
          payment._id.toString(),
          confirmationHtml,
        );
      }
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }

    // Delete cart
    if (payment.itemIds && payment.itemIds.length > 0) {
      for (const cartId of payment.itemIds) {
        try {
          await this.cartService.deleteCartById(cartId);
        } catch (error) {
          console.error(`Failed to delete cart ${cartId}:`, error);
        }
      }
    }
  }

  private async handlePaymentFailure(intent: Stripe.PaymentIntent) {
    const payment = await this.paymentModel.findOne({
      paymentIntent: intent.id,
    });

    if (!payment || payment.paymentStatus !== 'pending') return;

    payment.paymentStatus = 'failed';
    payment.orderStatus = 'failed';
    await payment.save();
  }

  private buildConfirmationHtml(
    firstName: string,
    lastName: string,
    payment: PaymentDocument,
  ): string {
    const itemsHtml = payment.items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName}${item.color ? ` (${item.color})` : ''}${item.size ? ` - ${item.size}` : ''}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const currencySymbol = payment.currency === 'cad' ? 'C$' : '$';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; }
          .header h1 { color: #4CAF50; margin: 0; }
          .content { color: #333; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f9f9f9; padding: 10px 8px; text-align: left; border-bottom: 2px solid #ddd; }
          .total-row td { font-weight: bold; padding-top: 12px; border-top: 2px solid #333; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>✓ Order Confirmed</h1></div>
          <div class="content">
            <p>Hi <strong>${firstName} ${lastName}</strong>,</p>
            <p>Thank you for your order! Your payment has been successfully processed.</p>
            <table>
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr class="total-row"><td colspan="2">Subtotal</td><td style="text-align: right;">${currencySymbol}${payment.subtotal.toFixed(2)}</td></tr>
                <tr><td colspan="2">Shipping</td><td style="text-align: right;">${payment.shippingCost === 0 ? 'FREE' : currencySymbol + payment.shippingCost.toFixed(2)}</td></tr>
                <tr style="font-size: 16px; color: #4CAF50;"><td colspan="2"><strong>Total</strong></td><td style="text-align: right;"><strong>${currencySymbol}${payment.totalAmount.toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
            <p>Shipping to: ${payment.shippingAddress?.street}, ${payment.shippingAddress?.city}, ${payment.shippingAddress?.province} ${payment.shippingAddress?.postalCode}, ${payment.shippingAddress?.country}</p>
            <p>Your order is now being processed. You will receive a shipping update shortly.</p>
          </div>
          <div class="footer"><p>This is an automated message. Please do not reply.</p></div>
        </div>
      </body>
      </html>
    `;
  }

  async getAllPayments() {
    return this.paymentModel.find().sort({ createdAt: -1 });
  }

  async getPaymentsByUser(userId: string) {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 });
  }

  async getPaymentById(id: string) {
    return this.paymentModel.findById(id);
  }
}
