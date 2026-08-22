import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Preorder, PreorderDocument, PreorderStatus } from './preorder.schema';
import { Product, ProductDocument } from '../products/product.schema';
import { User, UserDocument } from '../user/user.schema';
import { sendEmail } from '../utils/sendEmail';
import { getBrandedEmailHtml } from '../utils/getBrandedEmailHtml';

@Injectable()
export class PreordersService {
  constructor(
    @InjectModel(Preorder.name)
    private readonly preorderModel: Model<PreorderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createPreorder(userId: string, productId: string) {
    const [user, product] = await Promise.all([
      this.userModel.findById(userId).select('firstName lastName email phoneNum').lean(),
      this.productModel
        .findById(productId)
        .select('productName productType category imgs isPreOrder')
        .lean(),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isPreOrder) {
      throw new BadRequestException('This product is not available for pre-order');
    }

    const existing = await this.preorderModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (existing) {
      throw new ConflictException('You have already pre-ordered this product');
    }

    try {
      const preorder = await this.preorderModel.create({
        userId: new Types.ObjectId(userId),
        productId: new Types.ObjectId(productId),
        userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        userEmail: user.email,
        userPhone: user.phoneNum,
        productName: product.productName,
        productImage: product.imgs?.[0],
        productType: product.productType,
        category: product.category,
        status: PreorderStatus.PENDING,
      });

      // Send auto-reply to customer and notification to orders team
      if (user.email) {
        const userName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Valued Customer';
        const frontendUrl = process.env.FRONTEND_URL || 'https://doundogames.com';

        // 1. User Auto-Reply "Thank You" Confirmation Email
        const userHtml = `
          <div style="background-color: #FAF6EE; border-left: 4px solid #F04D2A; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">Thank You for Your Pre-Order!</h3>
            <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin-bottom: 0;">
              Hi <strong>${userName}</strong>, we have received your pre-order for <strong>${product.productName}</strong>. We will notify you as soon as this item is ready for fulfillment.
            </p>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
            <tr><td style="padding: 14px 16px; background-color: #FAF6EE; font-size: 13px; color: #6B7280; width: 40%;">Product</td><td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: #0E1D2B;">${product.productName}</td></tr>
            ${product.category ? `<tr><td style="padding: 14px 16px; background-color: #FAF6EE; font-size: 13px; color: #6B7280;">Category</td><td style="padding: 14px 16px; font-size: 14px; color: #0E1D2B;">${product.category}</td></tr>` : ''}
            <tr><td style="padding: 14px 16px; background-color: #FAF6EE; font-size: 13px; color: #6B7280;">Status</td><td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: #F04D2A;">Pre-Order Confirmed (Pending)</td></tr>
          </table>
          <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
            If you have any questions regarding your pre-order, please contact us at <a href="mailto:orders@doundogames.com" style="color: #0EA5B8; text-decoration: underline;">orders@doundogames.com</a>.
          </p>
        `;

        const userBrandedHtml = getBrandedEmailHtml({
          title: 'Pre-Order Confirmation',
          bodyHtml: userHtml,
          ctaText: 'Visit Doundo Games',
          ctaUrl: frontendUrl,
        });

        // 2. Orders Team Notification Email
        const adminHtml = `
          <div style="background-color: #FAF6EE; border-left: 4px solid #0EA5B8; padding: 20px; border-radius: 6px;">
            <h3 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">New Pre-Order Placed</h3>
            <p style="margin: 6px 0; color: #4B5563;"><strong>Customer:</strong> ${userName} (${user.email})</p>
            <p style="margin: 6px 0; color: #4B5563;"><strong>Product:</strong> ${product.productName}</p>
            <p style="margin: 6px 0; color: #4B5563;"><strong>Category:</strong> ${product.category || 'N/A'}</p>
            <p style="margin: 6px 0; color: #4B5563;"><strong>Phone:</strong> ${user.phoneNum || 'N/A'}</p>
          </div>
        `;

        const adminBrandedHtml = getBrandedEmailHtml({
          title: 'New Pre-Order Received',
          bodyHtml: adminHtml,
        });

        const emailPromises = [
          sendEmail(
            user.email,
            `Pre-Order Confirmation: ${product.productName}`,
            userBrandedHtml,
            'orders',
          ).catch((err) => {
            console.error(`Failed to send preorder auto-reply to ${user.email}:`, err);
          }),
          sendEmail(
            process.env.ORDER_NOTIFICATION_RECIPIENT || 'orders@doundogames.com',
            `New Pre-Order: ${product.productName} by ${userName}`,
            adminBrandedHtml,
            'orders',
          ).catch((err) => {
            console.error('Failed to send preorder admin notification:', err);
          }),
        ];

        Promise.allSettled(emailPromises);
      }

      return preorder;
    } catch (error) {
      // The unique index is the final guard if two requests arrive at once.
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('You have already pre-ordered this product');
      }
      throw error;
    }
  }

  async getAllPreorders(search?: string, status?: string) {
    const query: Record<string, unknown> = {};

    if (status && Object.values(PreorderStatus).includes(status as PreorderStatus)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
      ];
    }

    // Use lookups instead of only Mongoose populate so legacy preorder rows also
    // consistently return the product image and current customer contact details.
    return this.preorderModel.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          productId: {
            $cond: [
              { $ne: ['$product', null] },
              {
                _id: '$product._id',
                productName: '$product.productName',
                imgs: { $ifNull: ['$product.imgs', []] },
              },
              '$productId',
            ],
          },
          productImage: {
            $ifNull: ['$productImage', { $arrayElemAt: ['$product.imgs', 0] }],
          },
          userPhone: { $ifNull: ['$userPhone', '$user.phoneNum'] },
          userEmail: { $ifNull: ['$userEmail', '$user.email'] },
        },
      },
      { $project: { product: 0, user: 0 } },
      { $sort: { createdAt: -1 } },
    ]);
  }

  async updatePreorderStatus(preorderId: string, status: PreorderStatus) {
    if (!Object.values(PreorderStatus).includes(status)) {
      throw new BadRequestException('Invalid preorder status');
    }

    const preorder = await this.preorderModel
      .findByIdAndUpdate(preorderId, { status }, { new: true })
      .lean();

    if (!preorder) {
      throw new NotFoundException('Preorder not found');
    }

    return preorder;
  }
}
