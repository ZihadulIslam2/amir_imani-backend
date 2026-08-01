import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/product.schema';
import { User, UserDocument } from '../user/user.schema';
import { CreateProductNotificationDto } from './dto/create-product-notification.dto';
import {
  ProductNotification,
  ProductNotificationDocument,
} from './product-notification.schema';

@Injectable()
export class ProductNotificationsService {
  constructor(
    @InjectModel(ProductNotification.name)
    private readonly notificationModel: Model<ProductNotificationDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateProductNotificationDto) {
    const email = dto.email.trim().toLowerCase();
    const [product, user] = await Promise.all([
      this.productModel
        .findById(dto.productId)
        .select('productName imgs')
        .lean(),
      this.userModel.findOne({ email }).select('firstName lastName').lean(),
    ]);
    if (!product) throw new NotFoundException('Product not found');
    try {
      return await this.notificationModel.create({
        productId: new Types.ObjectId(dto.productId),
        email,
        ...(user?._id ? { userId: user._id } : {}),
        ...(user
          ? {
              userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
            }
          : {}),
        productName: product.productName,
        productImage: product.imgs?.[0],
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException(
          'You are already on the notification list for this product',
        );
      throw error;
    }
  }

  getAll() {
    return this.notificationModel.find().sort({ createdAt: -1 }).lean();
  }
}
