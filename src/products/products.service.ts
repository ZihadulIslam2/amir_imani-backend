import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { classToPlain } from 'class-transformer';
import {
  Product,
  ProductCategory,
  ProductDocument,
  ProductType,
} from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PaymentRecord, PaymentDocument } from '../payment/paymentRecord';
import { Cart, CartDocument } from '../cart/cart.schema';
import { CartService } from '../cart/cart.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(PaymentRecord.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly cartService: CartService,
    @InjectQueue('product-notification')
    private readonly productNotificationQueue: Queue,
  ) {}

  async createProduct(
    dto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const baseImgs = dto.existingImgs ?? dto.imgs ?? [];
    let uploadedImgs: string[] = [];
    if (files?.length) {
      const uploads = await Promise.all(
        files.map((f) => this.cloudinaryService.uploadImage(f)),
      );
      uploadedImgs = uploads
        .map((u) => u?.secure_url)
        .filter(Boolean) as string[];
    }
    const imgs = Array.from(new Set([...baseImgs, ...uploadedImgs]));
    const productData = this.prepareProductPayload(dto);

    const newProduct = new this.productModel({
      ...productData,
      imgs,
    });
    const savedProduct = await newProduct.save();

    // // Add job to queue to send notifications to all subscribers
    // await this.productNotificationQueue.add(
    //   'notify-subscribers',
    //   {
    //     productId: savedProduct._id.toString(),
    //     productName: savedProduct.productName,
    //     price: savedProduct.price,
    //     feature: savedProduct.feature,
    //     description: savedProduct.description,
    //     imgs: savedProduct.imgs,
    //     productType: savedProduct.productType,
    //   },
    //   {
    //     attempts: 3,
    //     backoff: {
    //       type: 'exponential',
    //       delay: 2000,
    //     },
    //     removeOnComplete: true,
    //   },
    // );

    return savedProduct;
  }

  async getAllProducts(
    type?: string,
    search?: string,
    category?: ProductCategory,
  ): Promise<Product[]> {
    const query: FilterQuery<Product> = {};

    if (
      category &&
      !Object.values(ProductCategory).includes(category as ProductCategory)
    ) {
      throw new BadRequestException(
        'Invalid product category. Allowed values are: ALL, APPAREL, ACCESSORIES, PRINTS & POSTERS, STATIONERY, HOME & DECOR, COLLECTIBLES.',
      );
    }

    if (type) {
      query.productType = type;
    }

    if (category) {
      if (type === ProductType.CARD) {
        throw new BadRequestException(
          'Category filter is only available for merchandise products.',
        );
      }

      query.productType = ProductType.MARCHANDICE;

      if (category !== ProductCategory.ALL) {
        query.category = category;
      }
    }

    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    return await this.productModel.find(query).exec();
  }

  getMerchandiseCategories(): ProductCategory[] {
    return Object.values(ProductCategory);
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findPurchasedProducts(userId: string): Promise<Product[]> {
    const successfulPayments = await this.paymentModel
      .find({ userId, paymentStatus: 'paid' })
      .exec();

    if (!successfulPayments.length) {
      return [];
    }

    const cartIds = successfulPayments
      .map((payment) => payment.itemIds)
      .filter(Boolean)
      .flat()
      .map((id) => new Types.ObjectId(id));

    const carts = await this.cartModel
      .find(
        cartIds.length
          ? { _id: { $in: cartIds } }
          : { userId: new Types.ObjectId(userId) },
      )
      .exec();

    const productIds = carts.flatMap((cart) =>
      cart.productIds.map((item) => item.productId),
    );
    const uniqueProductIds = [...new Set(productIds.map(String))];

    return this.productModel.find({ _id: { $in: uniqueProductIds } }).exec();
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const baseImgs = dto.existingImgs ?? dto.imgs ?? [];
    let uploadedImgs: string[] = [];
    if (files?.length) {
      const uploads = await Promise.all(
        files.map((f) => this.cloudinaryService.uploadImage(f)),
      );
      uploadedImgs = uploads
        .map((u) => u?.secure_url)
        .filter(Boolean) as string[];
    }
    const imgs = Array.from(new Set([...baseImgs, ...uploadedImgs]));
    const currentProduct = await this.productModel.findById(id).exec();

    if (!currentProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const productData = this.prepareProductPayload(dto, currentProduct);
    const { category, ...productDataWithoutCategory } = productData;
    const shouldUnsetCategory = category === undefined;
    const updateQuery = shouldUnsetCategory
      ? {
          $set: { ...productDataWithoutCategory, imgs },
          $unset: { category: '' },
        }
      : { $set: { ...productData, imgs } };
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateQuery, { new: true })
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    const result = await this.productModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Remove product from all carts
    await this.cartService.deleteProductFromAllCarts(id);

    return { message: 'Product deleted successfully' };
  }

  private prepareProductPayload(
    dto: CreateProductDto | UpdateProductDto,
    currentProduct?: Product,
  ) {
    const plainDto = classToPlain(dto) as Record<string, any>;
    const productType = (plainDto.productType as ProductType) ?? currentProduct?.productType;
    const category = (plainDto.category as ProductCategory) ?? currentProduct?.category;

    if (productType === ProductType.CARD && plainDto.category) {
      throw new BadRequestException(
        'Category is only allowed for merchandise products.',
      );
    }

    if (productType === ProductType.CARD) {
      return {
        ...plainDto,
        category: undefined,
      };
    }

    if (productType === ProductType.MARCHANDICE && !category) {
      throw new BadRequestException(
        'Category is required for merchandise products.',
      );
    }

    return {
      ...plainDto,
      category,
    };
  }
}
