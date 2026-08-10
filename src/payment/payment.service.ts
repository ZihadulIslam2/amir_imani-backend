import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import * as geoip from 'geoip-lite';
import { PaymentRecord, PaymentDocument } from './paymentRecord';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CartService } from '../cart/cart.service';
import { ShippingService } from '../shipping/shipping.service';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/user.service';
import { CouponService } from '../coupons/coupon.service';
import { Product, ProductDocument } from '../products/product.schema';
import {
  findColorSizeStock,
  usesColorSizeStock,
} from '../products/color-size-stock';
import { getBrandedEmailHtml } from '../utils/getBrandedEmailHtml';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    @InjectModel(PaymentRecord.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    private readonly cartService: CartService,
    private readonly shippingService: ShippingService,
    private readonly emailService: EmailService,
    private readonly couponService: CouponService,
    private readonly userService: UserService,
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
    // --- STEP 0: Auto-register guest user ---
    if (!dto.userId) {
      if (!dto.email) {
        throw new BadRequestException('Email is required for guest checkout');
      }
      let user = await this.userService.findByEmail(dto.email);
      if (!user) {
        const password = randomBytes(6).toString('hex');
        user = await this.userService.create({
          firstName: dto.firstName || 'Guest',
          lastName: dto.lastName || '',
          email: dto.email,
          password,
        });
        await this.emailService.sendPasswordMail(dto.email, password);
      }
      dto.userId = (user as unknown as { _id: string })._id.toString();
    }

    // --- STEP 1: Get items (inline or from DB cart) ---
    const items: Array<{
      productId: string;
      productName: string;
      price: number;
      currency: string;
      quantity: number;
      color?: string;
      size?: string;
    }> = [];

    let subtotalUsd = 0;
    let cartIds: string[] = [];
    const exchangeRate = parseFloat(process.env.CAD_EXCHANGE_RATE || '1.44');

    if (dto.items && dto.items.length > 0) {
      // Inline checkout is a self-contained order snapshot. Do not append it
      // to a server cart: the storefront uses a local cart, and an old cart
      // could contain products that have since been deleted.
      for (const item of dto.items) {
        const product = await this.productModel.findById(item.productId);
        if (!product) {
          throw new BadRequestException(
            `Product with ID ${item.productId} was not found`,
          );
        }

        this.assertVariantAvailability(
          product,
          item.color,
          item.size,
          item.quantity,
        );

        const usdPrice = Number(product.price);
        const cadPrice = Number(product.ca_price);
        const hasUsdPrice = Number.isFinite(usdPrice) && usdPrice > 0;
        const hasCadPrice = Number.isFinite(cadPrice) && cadPrice > 0;

        if (!hasUsdPrice && !hasCadPrice) {
          throw new BadRequestException(
            `Product with ID ${item.productId} does not have a valid price`,
          );
        }

        // Prices and coupon thresholds are calculated in USD. Some catalogue
        // entries only have a Canadian price, so convert that value instead of
        // treating the product as missing from the cart.
        const priceInUsd = hasUsdPrice ? usdPrice : cadPrice / exchangeRate;

        items.push({
          productId: product._id.toString(),
          productName: product.productName,
          price: priceInUsd,
          currency: 'usd',
          quantity: item.quantity,
          color: item.color,
          size: item.size,
        });

        subtotalUsd += priceInUsd * item.quantity;
      }
    } else {
      // Existing flow: fetch cart from DB
      let cart;
      try {
        cart = await this.cartService.getCartByUserId(dto.userId);
      } catch {
        throw new BadRequestException('Cart not found');
      }

      if (!cart.productIds || cart.productIds.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      cartIds = [(cart as unknown as { _id: string })._id.toString()];

      for (const cartItem of cart.productIds) {
        const product = cartItem.productId as unknown as {
          _id: string;
          productName: string;
          price: number;
        };
        if (!product || !product.price) continue;

        items.push({
          productId: product._id.toString(),
          productName: product.productName,
          price: product.price,
          currency: 'usd',
          quantity: cartItem.quantity,
          color: cartItem.color,
          size: cartItem.size,
        });

        subtotalUsd += product.price * cartItem.quantity;
      }

      if (items.length === 0) {
        throw new BadRequestException('No valid products in cart');
      }
    }

    // Re-check selected size stock for both direct checkout and cart checkout,
    // and derive the order type from the authoritative product records.
    let containsPreorderProduct = false;
    for (const item of items) {
      const product = await this.productModel.findById(item.productId).lean();
      if (!product) {
        throw new BadRequestException(
          `Product with ID ${item.productId} was not found`,
        );
      }
      containsPreorderProduct ||= Boolean(product.isPreOrder);
      this.assertVariantAvailability(
        product,
        item.color,
        item.size,
        item.quantity,
      );
    }
    const orderType = containsPreorderProduct ? 'preorder' : 'order';
    if (dto.orderType && dto.orderType !== orderType) {
      throw new BadRequestException(
        'Order type does not match the selected products',
      );
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

    // 3. Apply coupon if provided
    let couponId: Types.ObjectId | undefined;
    let discountAmount = 0;

    if (dto.couponCode) {
      const validation = await this.couponService.validateCoupon({
        code: dto.couponCode,
        userId: dto.userId,
        cartTotal: subtotalUsd,
      });

      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }

      discountAmount = validation.data!.discountAmount;
      couponId = new Types.ObjectId(validation.data!.couponId);
      subtotalUsd = Math.max(0, subtotalUsd - discountAmount);
    }

    // 4. Calculate shipping cost
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

    const total = Math.round((subtotalInCurrency + shippingInCurrency) * 100);

    // 6. Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: total,
      currency,
      metadata: {
        userId: dto.userId,
        orderType,
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
      itemIds: cartIds,
      paymentIntent: paymentIntent.id,
      totalAmount: total / 100,
      currency: paymentIntent.currency,
      subtotal: subtotalInCurrency,
      shippingCost: shippingInCurrency,
      items,
      shippingAddress: dto.shippingAddress,
      couponId,
      discountAmount,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      orderType,
    });

    // 8. Return coupon info for client
    const couponInfo = couponId
      ? { couponId: couponId.toString(), discountAmount }
      : undefined;

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      stripeMode: paymentIntent.livemode ? 'live' : 'test',
      ...(couponInfo && { coupon: couponInfo }),
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
      const intent = event.data.object;
      await this.handlePaymentSuccess(intent);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      await this.handlePaymentFailure(intent);
    }
  }

  private async handlePaymentSuccess(intent: Stripe.PaymentIntent) {
    const payment = await this.paymentModel.findOne({
      paymentIntent: intent.id,
    });

    if (!payment || payment.paymentStatus === 'paid') return;

    await this.decrementVariantStocks(payment.items);

    payment.paymentStatus = 'paid';
    payment.orderStatus = 'processing';
    await payment.save();

    // Record coupon usage if applied
    if (payment.couponId && payment.discountAmount > 0) {
      try {
        await this.couponService.recordUsage(
          payment.couponId.toString(),
          payment.userId,
          payment._id.toString(),
          payment.discountAmount,
        );
      } catch (error) {
        console.error('Failed to record coupon usage:', error);
      }
    }

    // Send confirmation email
    try {
      const user = await this.userService.findById(payment.userId);
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
        await this.emailService.sendPaymentNotificationEmail(
          user.firstName,
          user.lastName,
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

  private assertVariantAvailability(
    product: Product,
    color: string | undefined,
    size: string | undefined,
    quantity: number,
  ) {
    if (usesColorSizeStock(product)) {
      if (!color || !size) {
        throw new BadRequestException(
          `Please select a color and size for ${product.productName}`,
        );
      }

      const variantStock = findColorSizeStock(product, color, size);
      if (!variantStock || variantStock.quantity < quantity) {
        throw new BadRequestException(
          `${color} ${size.toUpperCase()} is out of stock for ${product.productName}`,
        );
      }
      return;
    }

    if (!size || !product.sizeStocks?.length) return;
    const sizeStock = product.sizeStocks.find((item) => item.size === size);
    if (!sizeStock || sizeStock.quantity < quantity) {
      throw new BadRequestException(
        `${size.toUpperCase()} is out of stock for ${product.productName}`,
      );
    }
  }

  private async decrementVariantStocks(
    items: Array<{
      productId: string;
      color?: string;
      size?: string;
      quantity: number;
    }>,
  ) {
    const requested = new Map<
      string,
      { productId: string; color?: string; size: string; quantity: number }
    >();
    for (const item of items) {
      if (!item.size) continue;
      const key = `${item.productId}:${item.color || ''}:${item.size}`;
      const current = requested.get(key);
      requested.set(key, {
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: (current?.quantity || 0) + item.quantity,
      });
    }

    for (const item of requested.values()) {
      const product = await this.productModel.findById(item.productId).lean();
      if (!product) continue;
      const result = usesColorSizeStock(product)
        ? await this.productModel.updateOne(
            {
              _id: item.productId,
              colorSizeStocks: {
                $elemMatch: {
                  color: item.color,
                  sizes: {
                    $elemMatch: {
                      size: item.size,
                      quantity: { $gte: item.quantity },
                    },
                  },
                },
              },
            },
            {
              $inc: {
                'colorSizeStocks.$[color].sizes.$[size].quantity':
                  -item.quantity,
              },
            },
            {
              arrayFilters: [
                { 'color.color': item.color },
                {
                  'size.size': item.size,
                  'size.quantity': { $gte: item.quantity },
                },
              ],
            },
          )
        : product.sizeStocks?.length
          ? await this.productModel.updateOne(
              {
                _id: item.productId,
                sizeStocks: {
                  $elemMatch: {
                    size: item.size,
                    quantity: { $gte: item.quantity },
                  },
                },
              },
              { $inc: { 'sizeStocks.$.quantity': -item.quantity } },
            )
          : undefined;
      if (!result) continue;
      if (result.modifiedCount !== 1) {
        throw new BadRequestException(
          `${item.color ? `${item.color} ` : ''}${item.size.toUpperCase()} is no longer available for ${product.productName}`,
        );
      }
    }
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
            <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; color: #1F2937;">${item.productName}${item.color ? ` (${item.color})` : ''}${item.size ? ` - ${item.size}` : ''}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #4B5563;">${item.quantity}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600; color: #1F2937;">$${item.price.toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const currencySymbol = payment.currency === 'cad' ? 'C$' : '$';

    const innerHtml = `
      <p style="font-size: 16px; margin-top: 0; color: #1F2937;">Hi <strong>${firstName} ${lastName}</strong>,</p>
      <p style="color: #4B5563; line-height: 1.6;">Thank you for your purchase! Your payment has been successfully processed and your order is confirmed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr style="background-color: #FAF6EE; border-bottom: 2px solid #E5E7EB;">
            <th style="padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #0E1D2B; text-transform: uppercase;">Item</th>
            <th style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; color: #0E1D2B; text-transform: uppercase;">Qty</th>
            <th style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #0E1D2B; text-transform: uppercase;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px 8px; border-top: 1px solid #E5E7EB; color: #4B5563;">Subtotal</td>
            <td style="padding: 10px 8px; border-top: 1px solid #E5E7EB; text-align: right; font-weight: 600;">${currencySymbol}${payment.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px 8px; color: #4B5563;">Shipping</td>
            <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${payment.shippingCost === 0 ? 'FREE' : currencySymbol + payment.shippingCost.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 17px; font-weight: 700; color: #F04D2A;">
            <td colspan="2" style="padding: 14px 8px; border-top: 2px solid #0E1D2B;">Total Paid</td>
            <td style="padding: 14px 8px; border-top: 2px solid #0E1D2B; text-align: right;">${currencySymbol}${payment.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="background-color: #FAF6EE; border-left: 4px solid #0EA5B8; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #374151;"><strong>Shipping Address:</strong><br />${payment.shippingAddress?.street}, ${payment.shippingAddress?.city}, ${payment.shippingAddress?.province} ${payment.shippingAddress?.postalCode}, ${payment.shippingAddress?.country}</p>
      </div>
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">Your order is being processed and will be shipped soon. Thank you for choosing Doundo Games!</p>
    `;

    return getBrandedEmailHtml({
      title: 'Order Confirmed ✓',
      bodyHtml: innerHtml,
    });
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
