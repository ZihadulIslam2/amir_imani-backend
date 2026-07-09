import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentRecord } from '../payment/paymentRecord';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(PaymentRecord.name) private paymentModel: Model<PaymentRecord>,
  ) {}

  async getAllOrders(
    page = 1,
    limit = 10,
  ): Promise<{
    orders: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [ordersAgg, total] = await Promise.all([
      this.paymentModel
        .aggregate<Record<string, unknown>>([
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
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
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              customerName: {
                $concat: ['$user.firstName', ' ', '$user.lastName'],
              },
              products: {
                $map: {
                  input: '$items',
                  as: 'item',
                  in: '$$item.productName',
                },
              },
              orderDate: '$createdAt',
              totalAmount: 1,
              paymentStatus: 1,
              orderStatus: 1,
            },
          },
        ])
        .exec(),
      this.paymentModel.countDocuments().exec(),
    ]);

    return {
      orders: ordersAgg,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
