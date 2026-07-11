import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Review, ReviewDocument, ReviewStatus } from './review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { Product, ProductDocument } from '../products/product.schema';
import { User, UserDocument } from '../user/user.schema';

type ReviewUser = {
  userId: string;
  role: string;
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getProductReviews(productId: string) {
    await this.ensureProductExists(productId);

    const reviews = await this.reviewModel
      .find({
        productId: new Types.ObjectId(productId),
        status: ReviewStatus.PUBLISHED,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const summary = this.buildSummary(reviews);

    return {
      reviews: reviews.map((review) => this.toReviewResponse(review)),
      summary,
    };
  }

  async getReviewEligibility(productId: string, userId: string) {
    await this.ensureProductExists(productId);

    const existingReview = await this.reviewModel
      .findOne({
        productId: new Types.ObjectId(productId),
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    return {
      hasPurchased: false,
      hasReviewed: Boolean(existingReview),
      canReview: !existingReview,
      review: existingReview ? this.toReviewResponse(existingReview) : null,
    };
  }

  async createReview(dto: CreateReviewDto, userId?: string) {
    const [product, user] = await Promise.all([
      this.productModel.findById(dto.productId).exec(),
      userId ? this.userModel.findById(userId).exec() : Promise.resolve(null),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const normalizedEmail = (user?.email || dto.userEmail || '').trim().toLowerCase();
    const normalizedName =
      `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
      dto.userName?.trim() ||
      '';

    if (!normalizedName) {
      throw new BadRequestException('Name is required to submit a review.');
    }

    if (!normalizedEmail) {
      throw new BadRequestException('Email is required to submit a review.');
    }

    const duplicateFilter: FilterQuery<Review> = {
      productId: new Types.ObjectId(dto.productId),
      ...(userId
        ? {
            $or: [
              { userId: new Types.ObjectId(userId) },
              { userEmail: normalizedEmail },
            ],
          }
        : { userEmail: normalizedEmail }),
    };

    const existingReview = await this.reviewModel.findOne(duplicateFilter);

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product.');
    }

    const review = await this.reviewModel.create({
      productId: product._id,
      ...(user ? { userId: user._id } : {}),
      rating: dto.rating,
      review: dto.review.trim(),
      status: ReviewStatus.PENDING,
      userName: normalizedName,
      userEmail: normalizedEmail,
      productName: product.productName,
    });

    return this.toReviewResponse(review.toObject());
  }

  async getAllReviews(
    requester: ReviewUser,
    search?: string,
    status?: string,
  ) {
    this.ensureAdmin(requester);

    const query: FilterQuery<Review> = {};

    if (status && status !== 'all') {
      query.status = status.toLowerCase();
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' };
      query.$or = [
        { userName: regex },
        { userEmail: regex },
        { productName: regex },
        { review: regex },
      ];
    }

    const reviews = await this.reviewModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return reviews.map((review) => this.toReviewResponse(review));
  }

  async updateReviewStatus(
    requester: ReviewUser,
    reviewId: string,
    dto: UpdateReviewStatusDto,
  ) {
    this.ensureAdmin(requester);

    const review = await this.reviewModel
      .findByIdAndUpdate(
        reviewId,
        { status: dto.status },
        { new: true },
      )
      .lean()
      .exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.toReviewResponse(review);
  }

  async deleteReview(requester: ReviewUser, reviewId: string) {
    this.ensureAdmin(requester);

    const review = await this.reviewModel.findByIdAndDelete(reviewId).lean().exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return { message: 'Review deleted successfully' };
  }

  private async ensureProductExists(productId: string) {
    const product = await this.productModel.exists({
      _id: new Types.ObjectId(productId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private ensureAdmin(requester: ReviewUser) {
    if (requester.role !== 'admin') {
      throw new ForbiddenException('Only admins can manage reviews.');
    }
  }

  private buildSummary(reviews: Array<Record<string, any>>) {
    const totalReviews = reviews.length;
    const ratingBreakdown = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let totalRating = 0;

    for (const review of reviews) {
      totalRating += review.rating;
      ratingBreakdown[review.rating as keyof typeof ratingBreakdown] += 1;
    }

    return {
      totalReviews,
      averageRating: totalReviews
        ? Math.round((totalRating / totalReviews) * 10) / 10
        : 0,
      ratingBreakdown,
    };
  }

  private toReviewResponse(review: Record<string, any>) {
    return {
      id: String(review._id),
      productId: String(review.productId),
      userId: review.userId ? String(review.userId) : '',
      rating: review.rating,
      review: review.review,
      status: review.status,
      userName: review.userName,
      userEmail: review.userEmail,
      productName: review.productName,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
