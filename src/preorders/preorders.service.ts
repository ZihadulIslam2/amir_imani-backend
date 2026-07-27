import {
  BadRequestException,
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
      this.userModel.findById(userId).select('firstName lastName email').lean(),
      this.productModel
        .findById(productId)
        .select('productName productType category')
        .lean(),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.preorderModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (existing) {
      return existing;
    }

    const preorder = await this.preorderModel.create({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      userEmail: user.email,
      productName: product.productName,
      productType: product.productType,
      category: product.category,
      status: PreorderStatus.PENDING,
    });

    return preorder;
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

    return this.preorderModel.find(query).sort({ createdAt: -1 }).lean();
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
