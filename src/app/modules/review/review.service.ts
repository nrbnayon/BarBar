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

const updateSalonRatings = async (salonId: string, session: any) => {
  // Get all products and services for the salon
  const products = await Product.find({ salon: salonId, status: 'active' });
  const services = await Service.find({ salon: salonId, status: 'active' });

  // Calculate product ratings
  const productRatings = products.reduce(
    (sum, prod) => sum + (Number(prod.rating) || 0),
    0
  );
  const avgProductRating = products.length
    ? productRatings / products.length
    : 0;

  // Calculate service ratings
  const serviceRatings = services.reduce(
    (sum, serv) => sum + (serv.rating || 0),
    0
  );
  const avgServiceRating = services.length
    ? serviceRatings / services.length
    : 0;

  // Calculate overall rating
  const totalItems = products.length + services.length;
  const overallRating = totalItems
    ? (productRatings + serviceRatings) / totalItems
    : 0;

  // Calculate total reviews
  const totalReviews =
    products.reduce((sum, prod) => sum + (prod.reviewCount || 0), 0) +
    services.reduce((sum, serv) => sum + (serv.reviewCount || 0), 0);

  // Update salon ratings
  await Salon.findByIdAndUpdate(
    salonId,
    {
      ratings: {
        overall: Math.round(overallRating * 10) / 10,
        products: Math.round(avgProductRating * 10) / 10,
        services: Math.round(avgServiceRating * 10) / 10,
        totalReviews,
      },
    },
    { session }
  );
};

// Update the createReview function
const createReview = async (payload: Partial<IReview>): Promise<IReview> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Create the review
    const review = await Review.create([payload], { session });

    // Update product/service rating
    if (payload.product) {
      await updateProductRating(payload.product.toString(), session);
      const product = await Product.findById(payload.product);
      if (product) {
        await updateSalonRatings(product.salon.toString(), session);
      }
    } else if (payload.service) {
      await updateServiceRating(payload.service.toString(), session);
      const service = await Service.findById(payload.service);
      if (service) {
        await updateSalonRatings(service.salon.toString(), session);
      }
    }

    await session.commitTransaction();
    return review[0];
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
