import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { PaymentRecord, PaymentDocument } from './paymentRecord';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CartService } from '../cart/cart.service';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    @InjectQueue('payment-status')
    private readonly paymentQueue: Queue,

    @InjectModel(PaymentRecord.name)
    private readonly paymentModel: Model<PaymentDocument>,

    private readonly cartService: CartService,
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

  private async schedulePaymentStatusChecks(paymentId: string) {
    const delays = [
      10_000, // 10 sec
      20_000, // 20 sec
      50_000, // 50 sec
      60_000, // 1 min
      120_000,
      240_000,
      300_000, // 5 min
      600_000,
    ];

    for (const delay of delays) {
      await this.paymentQueue.add(
        'check-payment-status',
        { paymentId },
        {
          delay,
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
  }

  /* Create Stripe Checkout Session */
  async createStripePayment(dto: CreatePaymentDto) {
    const successUrl = 'https://doundogames.com/payment/success';
    console.log('siccessUrl', successUrl);
    const cancelUrl = 'https://doundogames.com/payment/cancel';

    // Create a Checkout Session so we can send the hosted payment page URL back to the client
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(dto.totalAmount * 100),
            product_data: { name: 'My Product' },
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: dto.userId,
      },
    });

    const payment = await this.paymentModel.create({
      userId: dto.userId,
      itemIds: dto.itemIds,
      seasonId: dto.seasonId,
      paymentIntent: (session.payment_intent as string) || undefined,
      checkoutSessionId: session.id,
      totalAmount: dto.totalAmount,
      paymentStatus: 'pending',
    });

    /* 🔥 Schedule background status checks */
    await this.schedulePaymentStatusChecks(payment._id.toString());

    return {
      checkoutUrl: session.url, // Hosted Stripe Checkout page
      paymentId: payment._id,
    };
  }

  /* -------------------- STRIPE STATUS CHECK (BullMQ) -------------------- */

  async checkStripePaymentStatus(paymentId: string) {
    const payment = await this.paymentModel.findById(paymentId);

    if (!payment) return;

    // Stop if already resolved
    if (payment.paymentStatus !== 'pending') return;

    if (!payment.checkoutSessionId) return;

    // 1️⃣ Get Checkout Session
    const session = await this.stripe.checkout.sessions.retrieve(
      payment.checkoutSessionId,
    );

    if (!session.payment_intent) return;

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent.id;

    // Save paymentIntent if not stored yet
    if (!payment.paymentIntent) {
      payment.paymentIntent = paymentIntentId;
      await payment.save();
    }

    // 2️⃣ Retrieve PaymentIntent
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    // 3️⃣ Update DB based on status
    if (intent.status === 'succeeded') {
      payment.paymentStatus = 'paid';
      await payment.save();

      // Delete cart items after successful payment
      if (payment.itemIds && payment.itemIds.length > 0) {
        for (const cartId of payment.itemIds) {
          try {
            // Validate that cartId is a valid ObjectId before attempting deletion
            if (Types.ObjectId.isValid(cartId)) {
              await this.cartService.deleteCartById(cartId);
            } else {
              console.warn(`Skipping invalid cart ID: ${cartId}`);
            }
          } catch (error) {
            console.error(`Failed to delete cart ${cartId}:`, error);
          }
        }
      }
      return;
    }

    if (
      intent.status === 'canceled' ||
      intent.status === 'requires_payment_method'
    ) {
      payment.paymentStatus = 'failed';
      await payment.save();
      return;
    }

    // still pending → BullMQ will retry
  }

  /* Update payment status (for webhook or manual update) */
  async updatePaymentStatus(paymentIntent: string, status: string) {
    return this.paymentModel.findOneAndUpdate(
      { paymentIntent },
      { paymentStatus: status },
      { new: true },
    );
  }

  /* Get all payments */
  async getAllPayments() {
    return this.paymentModel.find().sort({ createdAt: -1 });
  }

  /* Get payments by user */
  async getPaymentsByUser(userId: string) {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 });
  }

  /* Get single payment */
  async getPaymentById(id: string) {
    return this.paymentModel.findById(id);
  }
}
