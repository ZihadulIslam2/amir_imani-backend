import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Coupon,
  CouponDocument,
  DiscountType,
  CouponEligibility,
} from './coupon.schema';
import { CouponUsage, CouponUsageDocument } from './coupon-usage.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { PaymentRecord } from '../payment/paymentRecord';

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private couponUsageModel: Model<CouponUsageDocument>,
    @InjectModel(PaymentRecord.name) private paymentModel: Model<PaymentRecord>,
  ) {}

  async createCoupon(dto: CreateCouponDto): Promise<Coupon> {
    const existing = await this.couponModel
      .findOne({ code: dto.code.toUpperCase() })
      .exec();
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    const eligibleUsers =
      dto.eligibleUsers?.map((id) => new Types.ObjectId(id)) || [];

    const coupon = new this.couponModel({
      code: dto.code.toUpperCase(),
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxDiscountCap: dto.maxDiscountCap,
      usageLimit: dto.usageLimit,
      perUserLimit: dto.perUserLimit ?? 1,
      expiryDate: new Date(dto.expiryDate),
      eligibility: dto.eligibility ?? CouponEligibility.ALL,
      eligibleUsers,
      isActive: dto.isActive ?? true,
    });

    return coupon.save();
  }

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (dto.code) {
      const existing = await this.couponModel
        .findOne({
          code: dto.code.toUpperCase(),
          _id: { $ne: id },
        })
        .exec();
      if (existing) {
        throw new BadRequestException('Coupon code already exists');
      }
    }

    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      (dto.discountValue ?? coupon.discountValue) > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    const updateData: Record<string, unknown> = {};
    const fields: (keyof UpdateCouponDto)[] = [
      'code',
      'discountType',
      'discountValue',
      'minOrderAmount',
      'maxDiscountCap',
      'usageLimit',
      'perUserLimit',
      'expiryDate',
      'eligibility',
      'isActive',
    ];

    for (const field of fields) {
      if (dto[field] !== undefined) {
        if (field === 'code') {
          updateData[field] = dto[field].toUpperCase();
        } else if (field === 'expiryDate') {
          updateData[field] = new Date(dto[field]);
        } else {
          updateData[field] = dto[field];
        }
      }
    }

    if (dto.eligibleUsers) {
      updateData.eligibleUsers = dto.eligibleUsers.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const updated = await this.couponModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Coupon not found');
    }

    return updated;
  }

  async deleteCoupon(id: string): Promise<{ message: string }> {
    const result = await this.couponModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Coupon not found');
    }
    return { message: 'Coupon deleted successfully' };
  }

  async getAllCoupons(
    status?: 'active' | 'expired' | 'all',
  ): Promise<Coupon[]> {
    const now = new Date();
    let filter: Record<string, unknown> = {};

    if (status === 'active') {
      filter = { expiryDate: { $gte: now }, isActive: true };
    } else if (status === 'expired') {
      filter = { $or: [{ expiryDate: { $lt: now } }, { isActive: false }] };
    }

    return this.couponModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getCouponById(id: string): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async validateCoupon(dto: ValidateCouponDto) {
    const coupon = await this.couponModel
      .findOne({
        code: dto.code.toUpperCase(),
      })
      .exec();

    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    if (!coupon.isActive) {
      return { valid: false, message: 'This coupon is no longer active' };
    }

    if (new Date() > coupon.expiryDate) {
      return { valid: false, message: 'This coupon has expired' };
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        message: 'This coupon has reached its usage limit',
      };
    }

    if (dto.cartTotal < coupon.minOrderAmount) {
      return {
        valid: false,
        message: `Minimum order amount of $${coupon.minOrderAmount.toFixed(2)} required`,
      };
    }

    // Guest validation — skip user-specific checks
    if (!dto.userId) {
      let guestDiscount: number;
      if (coupon.discountType === DiscountType.PERCENTAGE) {
        guestDiscount = (dto.cartTotal * coupon.discountValue) / 100;
        if (
          coupon.maxDiscountCap &&
          guestDiscount > coupon.maxDiscountCap
        ) {
          guestDiscount = coupon.maxDiscountCap;
        }
      } else {
        guestDiscount = Math.min(coupon.discountValue, dto.cartTotal);
      }

      return {
        valid: true,
        message: 'Coupon applied successfully',
        data: {
          couponId: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: Math.round(guestDiscount * 100) / 100,
        },
      };
    }

    const userObjectId = new Types.ObjectId(dto.userId);

    if (coupon.eligibility === CouponEligibility.FIRST_TIME) {
      const orderCount = await this.paymentModel
        .countDocuments({
          userId: dto.userId,
          paymentStatus: 'paid',
        })
        .exec();
      if (orderCount > 0) {
        return {
          valid: false,
          message: 'This coupon is for first-time users only',
        };
      }
    }

    if (coupon.eligibility === CouponEligibility.SPECIFIC) {
      const isEligible = coupon.eligibleUsers.some(
        (uid) => uid.toString() === dto.userId,
      );
      if (!isEligible) {
        return {
          valid: false,
          message: 'You are not eligible for this coupon',
        };
      }
    }

    const usageCount = await this.couponUsageModel
      .countDocuments({
        couponId: coupon._id,
        userId: userObjectId,
      })
      .exec();

    if (usageCount >= coupon.perUserLimit) {
      return {
        valid: false,
        message: `You have already used this coupon ${usageCount} time(s)`,
      };
    }

    let discountAmount: number;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (dto.cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountCap && discountAmount > coupon.maxDiscountCap) {
        discountAmount = coupon.maxDiscountCap;
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, dto.cartTotal);
    }

    return {
      valid: true,
      message: 'Coupon applied successfully',
      data: {
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100,
      },
    };
  }

  async applyCoupon(dto: ValidateCouponDto, orderId?: string) {
    const validation = await this.validateCoupon(dto);
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    const userObjectId = new Types.ObjectId(dto.userId);
    const couponObjectId = new Types.ObjectId(validation.data!.couponId);

    await this.couponUsageModel.create({
      couponId: couponObjectId,
      userId: userObjectId,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      discountAmount: validation.data!.discountAmount,
    });

    await this.couponModel
      .findByIdAndUpdate(couponObjectId, {
        $inc: { usedCount: 1 },
      })
      .exec();

    return {
      success: true,
      message: 'Coupon applied successfully',
      discountAmount: validation.data!.discountAmount,
    };
  }

  async recordUsage(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ) {
    await this.couponUsageModel.create({
      couponId: new Types.ObjectId(couponId),
      userId: new Types.ObjectId(userId),
      orderId: new Types.ObjectId(orderId),
      discountAmount,
    });

    await this.couponModel
      .findByIdAndUpdate(couponId, {
        $inc: { usedCount: 1 },
      })
      .exec();
  }

  async getCouponAnalytics() {
    const totalCoupons = await this.couponModel.countDocuments().exec();
    const activeCoupons = await this.couponModel
      .countDocuments({
        isActive: true,
        expiryDate: { $gte: new Date() },
      })
      .exec();

    const usageStats = await this.couponUsageModel
      .aggregate<{ totalUsage: number; totalDiscountGiven: number }>([
        {
          $group: {
            _id: null,
            totalUsage: { $sum: 1 },
            totalDiscountGiven: { $sum: '$discountAmount' },
          },
        },
      ])
      .exec();

    const totalUsage = usageStats[0]?.totalUsage ?? 0;
    const totalDiscountGiven = usageStats[0]?.totalDiscountGiven ?? 0;

    const totalPaidOrders = await this.paymentModel
      .countDocuments({
        paymentStatus: 'paid',
      })
      .exec();

    const ordersWithCoupon = await this.paymentModel
      .countDocuments({
        paymentStatus: 'paid',
        couponId: { $exists: true, $ne: null },
      })
      .exec();

    const conversionRate =
      totalPaidOrders > 0
        ? Math.round((ordersWithCoupon / totalPaidOrders) * 10000) / 100
        : 0;

    const topCoupons = await this.couponUsageModel
      .aggregate<{
        _id: string;
        code: string;
        usageCount: number;
        totalDiscount: number;
      }>([
        {
          $group: {
            _id: '$couponId',
            usageCount: { $sum: 1 },
            totalDiscount: { $sum: '$discountAmount' },
          },
        },
        { $sort: { usageCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'coupons',
            localField: '_id',
            foreignField: '_id',
            as: 'coupon',
          },
        },
        { $unwind: { path: '$coupon', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            code: '$coupon.code',
            usageCount: 1,
            totalDiscount: { $round: ['$totalDiscount', 2] },
          },
        },
      ])
      .exec();

    const usageOverTime = await this.couponUsageModel
      .aggregate<{
        _id: string;
        count: number;
        discountGiven: number;
      }>([
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$usedAt' },
            },
            count: { $sum: 1 },
            discountGiven: { $sum: '$discountAmount' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ])
      .exec();

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons: totalCoupons - activeCoupons,
      totalUsage,
      totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
      conversionRate,
      ordersWithCoupon,
      totalPaidOrders,
      topCoupons,
      usageOverTime,
    };
  }
}
