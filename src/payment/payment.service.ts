import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { PaymentRecord, PaymentDocument } from './paymentRecord';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../email/email.service';
import { User } from '../user/user.schema';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    @InjectQueue('payment-status')
    private readonly paymentQueue: Queue,

    @InjectModel(PaymentRecord.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly cartService: CartService,
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
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
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

      // Send confirmation email to user
      try {
        const user = await this.userModel.findById(payment.userId);
        if (user) {
          const confirmationHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background-color: #f5f5f5;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  max-width: 600px;
                  margin: 20px auto;
                  background-color: #ffffff;
                  padding: 40px;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #4CAF50;
                  padding-bottom: 20px;
                }
                .header h1 {
                  color: #4CAF50;
                  margin: 0;
                }
                .content {
                  color: #333;
                  line-height: 1.6;
                }
                .payment-details {
                  background-color: #f9f9f9;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .detail-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 10px 0;
                }
                .detail-label {
                  font-weight: bold;
                  color: #555;
                }
                .detail-value {
                  color: #4CAF50;
                  font-weight: bold;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #ddd;
                  font-size: 12px;
                  color: #999;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✓ Payment Confirmed</h1>
                </div>
                <div class="content">
                  <p>Hi <strong>${user.firstName} ${user.lastName}</strong>,</p>
                  <p>Thank you for your purchase! Your payment has been successfully processed.</p>
                  
                  <div class="payment-details">
                    <div class="detail-row">
                      <span class="detail-label">Payment ID:</span>
                      <span class="detail-value">${payment._id.toString()}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Amount Paid:</span>
                      <span class="detail-value">$${payment.totalAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Status:</span>
                      <span class="detail-value">PAID</span>
                    </div>
                  </div>
                  
                  <p>Your order is now being processed. You will receive a shipping confirmation email shortly.</p>
                  <p>If you have any questions about your order, please don't hesitate to contact our support team.</p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `;

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
        // Don't throw error, email failure shouldn't block payment processing
      }

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
