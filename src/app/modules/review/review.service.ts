// src/app/modules/review/review.service.ts
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Product } from '../product/product.model';
import mongoose from 'mongoose';
import { Service } from '../services/services.model';
import {
  IReview,
  RatingMetadata,
  ReviewResponse,
  ReviewFilters,
  RatingDistribution,
  Rating,
} from './review.interface';
import { Review } from './review.model';
import { Salon } from '../salons/salon.model';

const createReview = async (payload: Partial<IReview>): Promise<IReview> => {
  // Check if user has already reviewed this item
  const existingReview = await Review.findOne({
    user: payload.user,
    $or: [{ product: payload.product }, { service: payload.service }],
    status: 'active',
  });

  if (existingReview) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have already reviewed this item'
    );
  }

  // Verify product/service exists and is active
  if (payload.product) {
    const product = await Product.findOne({
      _id: payload.product,
      status: 'active',
    });
    if (!product) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Product not found or is inactive'
      );
    }
  } else if (payload.service) {
    const service = await Service.findOne({
      _id: payload.service,
      status: 'active',
    });
    if (!service) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Service not found or is inactive'
      );
    }
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
  const reviews = await Review.find({
    product: productId,
    status: 'active',
  });

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
  const roundedRating = Math.round(averageRating * 10) / 10;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }

  await Product.findByIdAndUpdate(
    productId,
    {
      rating: roundedRating,
      reviewCount: reviews.length,
    },
    { session, new: true }
  );

  // Update salon's overall rating
  const allSalonProducts = await Product.find({ salon: product.salon });
  const salonRating =
    allSalonProducts.reduce((sum, prod) => sum + (Number(prod.rating) || 0), 0) /
    allSalonProducts.length;

  await Salon.findByIdAndUpdate(
    product.salon,
    {
      rating: Math.round(salonRating * 10) / 10,
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

const calculateRatingMetadata = async (query: any): Promise<RatingMetadata> => {
  const reviews = await Review.find(query);

  const totalReviews = reviews.length;

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating =
    totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;

  const ratingDistribution: RatingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach(review => {
    const roundedRating = Math.round(review.rating) as Rating;
    if (roundedRating >= 1 && roundedRating <= 5) {
      ratingDistribution[roundedRating]++;
    }
  });

  return {
    totalReviews,
    averageRating,
    ratingDistribution,
  };
};

const getReviews = async (filters: ReviewFilters): Promise<ReviewResponse> => {
  try {
    // Construct the query
    const query: Record<string, any> = { status: 'active' };

    // Add filters if they exist
    if (filters.product) {
      query.product = new mongoose.Types.ObjectId(filters.product);
    }
    if (filters.service) {
      query.service = new mongoose.Types.ObjectId(filters.service);
    }
    if (filters.user) {
      query.user = new mongoose.Types.ObjectId(filters.user);
    }

    // Get the reviews with populated fields
    const reviews = await Review.find(query)
      .populate({
        path: 'user',
        select: 'name email -_id',
      })
      .populate({
        path: 'product',
        select: 'name description price -_id',
      })
      .populate({
        path: 'service',
        select: 'name description price -_id',
      })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate metadata using the same query
    const meta = await calculateRatingMetadata(query);

    return {
      meta,
      data: reviews,
    };
  } catch (error) {
    console.error('Error in getReviews:', error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Error retrieving reviews'
    );
  }
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
