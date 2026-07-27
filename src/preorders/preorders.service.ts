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
      return await this.preorderModel.create({
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
