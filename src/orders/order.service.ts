import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { PaymentRecord } from '../payment/paymentRecord';
import { Product, ProductDocument } from '../products/product.schema';
import { ORDER_STATUSES, OrderStatus } from './dto/update-order-status.dto';

type OrderFilters = {
  search?: string;
  orderStatus?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  sort?: 'asc' | 'desc';
};

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(PaymentRecord.name) private paymentModel: Model<PaymentRecord>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async getAllOrders(
    page = 1,
    limit = 10,
    filters: OrderFilters = {},
  ): Promise<{
    orders: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    if (filters.orderStatus) match.orderStatus = filters.orderStatus;
    if (filters.paymentStatus) match.paymentStatus = filters.paymentStatus;

    const createdAt: Record<string, Date> = {};
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    if (startDate && !Number.isNaN(startDate.getTime())) createdAt.$gte = startDate;
    if (endDate && !Number.isNaN(endDate.getTime())) {
      endDate.setUTCHours(23, 59, 59, 999);
      createdAt.$lte = endDate;
    }
    if (Object.keys(createdAt).length) match.createdAt = createdAt;

    const basePipeline: PipelineStage[] = [
      ...(Object.keys(match).length
        ? [{ $match: match } as PipelineStage.Match]
        : []),
      {
        $lookup: {
          from: 'users',
          let: { userId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: '$_id' }, '$$userId'] },
              },
            },
          ],
          as: 'user',
        },
      } as PipelineStage.Lookup,
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];

    const normalizedSearch = filters.search?.trim();
    if (normalizedSearch) {
      const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      basePipeline.push({
        $match: {
          $or: [
            { 'user.firstName': { $regex: escapedSearch, $options: 'i' } },
            { 'user.lastName': { $regex: escapedSearch, $options: 'i' } },
            { 'user.email': { $regex: escapedSearch, $options: 'i' } },
            { 'items.productName': { $regex: escapedSearch, $options: 'i' } },
            { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: escapedSearch, options: 'i' } } },
          ],
        },
      } as PipelineStage.Match);
    }

    const sortDirection = filters.sort === 'asc' ? 1 : -1;
    const [ordersAgg, totalResult] = await Promise.all([
      this.paymentModel
        .aggregate<Record<string, unknown>>([
          ...basePipeline,
          { $sort: { createdAt: sortDirection } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'products',
              let: { orderedProductIds: '$items.productId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [{ $toString: '$_id' }, '$$orderedProductIds'],
                    },
                  },
                },
                { $project: { _id: 1, productName: 1, productType: 1, imgs: 1 } },
              ],
              as: 'productDetails',
            },
          },
          {
            $project: {
              _id: 1,
              customerName: {
                $concat: ['$user.firstName', ' ', '$user.lastName'],
              },
              customer: {
                name: {
                  $trim: {
                    input: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                  },
                },
                email: '$user.email',
                phone: '$user.phoneNum',
                avatar: '$user.avatar',
              },
              products: {
                $map: {
                  input: '$items',
                  as: 'item',
                  in: '$$item.productName',
                },
              },
              productDetails: 1,
              orderDate: '$createdAt',
              totalAmount: 1,
              currency: 1,
              subtotal: 1,
              shippingCost: 1,
              discountAmount: 1,
              paymentStatus: 1,
              orderStatus: 1,
            },
          },
        ])
        .exec(),
      this.paymentModel
        .aggregate<{ total: number }>([...basePipeline, { $count: 'total' }])
        .exec(),
    ]);
    const total = totalResult[0]?.total ?? 0;

    return {
      orders: ordersAgg,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrdersForUser(userId: string) {
    const orders = await this.paymentModel
      .find({ userId })
      .select(
        '_id items totalAmount currency subtotal shippingCost discountAmount paymentStatus orderStatus createdAt shippingAddress',
      )
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const productIds = [
      ...new Set(
        orders.flatMap((order) => order.items.map((item) => item.productId)),
      ),
    ];
    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .select('_id productName imgs productType')
      .lean()
      .exec();
    const productsById = new Map(
      products.map((product) => [product._id.toString(), product]),
    );

    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: productsById.get(item.productId) ?? null,
      })),
    }));
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid order status');
    }

    const order = await this.paymentModel
      .findByIdAndUpdate(orderId, { orderStatus: status }, { new: true })
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
