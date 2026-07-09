import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/user.schema';
import { PaymentRecord } from '../payment/paymentRecord';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PaymentRecord.name) private paymentModel: Model<PaymentRecord>,
  ) {}

  async getAllCustomers(
    status?: string,
    page = 1,
    limit = 10,
  ): Promise<{
    customers: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter: Record<string, unknown> = { role: 'user' };
    if (status && ['active', 'blocked'].includes(status)) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -verificationInfo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const userIds = users.map((u) => u._id.toString());
    const orderCounts = await this.paymentModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { userId: { $in: userIds }, paymentStatus: 'paid' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ])
      .exec();

    const orderCountMap = new Map(
      orderCounts.map((oc) => [oc._id, oc.count]),
    );

    const customers = users.map((user) => ({
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phoneNum,
      ordersCount: orderCountMap.get(user._id.toString()) || 0,
      joined: (user as Record<string, unknown>).createdAt,
      status: user.status ?? 'active',
    }));

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateCustomerStatus(
    id: string,
    status: string,
  ): Promise<Record<string, unknown>> {
    if (!['active', 'blocked'].includes(status)) {
      throw new BadRequestException('Status must be "active" or "blocked"');
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { status }, { new: true, select: '-password -verificationInfo' })
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('Customer not found');
    }

    return {
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phoneNum,
      status: user.status ?? 'active',
    };
  }
}
