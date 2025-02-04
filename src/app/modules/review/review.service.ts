// src/app/modules/review/review.service.ts
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Product } from '../product/product.model';
import { Service } from '../services/services.model';
import { IReview } from './review.interface';
import { Review } from './review.model';
import mongoose from 'mongoose';

const createReview = async (payload: Partial<IReview>): Promise<IReview> => {
  // Check if user has already reviewed this item
  const existingReview = await Review.findOne({
    user: payload.user,
    $or: [{ product: payload.product }, { service: payload.service }],
  });

  if (existingReview) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have already reviewed this item'
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const review = await Review.create([payload], { session });

    if (!review.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create review');
    }

    // Update product or service rating
    if (payload.product) {
      await updateProductRating(payload.product.toString(), session);
    } else if (payload.service) {
      await updateServiceRating(payload.service.toString(), session);
    }

    await session.commitTransaction();

    const populatedReview = await Review.findById(review[0]._id)
      .populate('user', 'name email')
      .populate('product')
      .populate('service');

    return populatedReview!;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateProductRating = async (productId: string, session: any) => {
  const reviews = await Review.find({ product: productId, status: 'active' });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  await Product.findByIdAndUpdate(
    productId,
    {
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length,
    },
    { session }
  );
};

const updateServiceRating = async (serviceId: string, session: any) => {
  const reviews = await Review.find({ service: serviceId, status: 'active' });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  await Service.findByIdAndUpdate(
    serviceId,
    {
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length,
    },
    { session }
  );
};

const getReviews = async (filters: {
  product?: string;
  service?: string;
  user?: string;
  status?: string;
}) => {
  const query = { ...filters, status: 'active' };

  const reviews = await Review.find(query)
    .populate('user', 'name email')
    .populate('product')
    .populate('service')
    .sort({ createdAt: -1 });

  return reviews;
};

const updateReview = async (
  id: string,
  userId: string,
  payload: Partial<IReview>
): Promise<IReview | null> => {
  const review = await Review.findOne({ _id: id, user: userId });

  if (!review) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Review not found or you are not authorized to update it'
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const updatedReview = await Review.findByIdAndUpdate(id, payload, {
      new: true,
      session,
    });

    if (review.product) {
      await updateProductRating(review.product.toString(), session);
    } else if (review.service) {
      await updateServiceRating(review.service.toString(), session);
    }

    await session.commitTransaction();
    return updatedReview;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const deleteReview = async (
  id: string,
  userId: string
): Promise<IReview | null> => {
  const review = await Review.findOne({ _id: id, user: userId });

  if (!review) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Review not found or you are not authorized to delete it'
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const deletedReview = await Review.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true, session }
    );

    if (review.product) {
      await updateProductRating(review.product.toString(), session);
    } else if (review.service) {
      await updateServiceRating(review.service.toString(), session);
    }

    await session.commitTransaction();
    return deletedReview;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const ReviewService = {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
};
