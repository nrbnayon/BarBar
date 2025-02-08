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
import { User } from '../user/user.model';
import { sendNotifications } from '../../../helpers/notificationHelper';

const roundRating = (rating: number): number => Math.round(rating * 10) / 10;

const updateSalonRatings = async (salonId: string, session: any) => {
  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
  }

  // Get all products and services for the salon
  const products = await Product.find({ salon: salonId, status: 'active' });
  const services = await Service.find({ salon: salonId, status: 'active' });

  // Calculate product ratings
  const productRatings = products.reduce(
    (sum, prod) => sum + (Number(prod.rating) || 0),
    0
  );
  const avgProductRating = products.length
    ? roundRating(productRatings / products.length)
    : 0;

  // Calculate service ratings
  const serviceRatings = services.reduce(
    (sum, serv) => sum + (serv.rating || 0),
    0
  );
  const avgServiceRating = services.length
    ? roundRating(serviceRatings / services.length)
    : 0;

  // Calculate overall rating
  const totalItems = products.length + services.length;
  const overallRating = totalItems
    ? roundRating((productRatings + serviceRatings) / totalItems)
    : 0;

  // Calculate total reviews
  const totalReviews =
    products.reduce((sum, prod) => sum + (prod.reviewCount || 0), 0) +
    services.reduce((sum, serv) => sum + (serv.reviewCount || 0), 0);

  // Update salon with the correct ratings structure
  await Salon.findByIdAndUpdate(
    salonId,
    {
      ratings: {
        overall: overallRating,
        products: avgProductRating,
        services: avgServiceRating,
        totalReviews: totalReviews,
      },
    },
    { session }
  );
};

// Update the createReview function
// const createReview = async (payload: Partial<IReview>): Promise<IReview> => {
//   // Check for existing review first
//   const existingReview = await Review.findOne({
//     user: payload.user,
//     status: 'active',
//     ...(payload.product
//       ? { product: payload.product }
//       : { service: payload.service }),
//   });
//   console.log('Product: ', payload.product);

//   if (!payload.product && !payload.service) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'Product or service is required'
//     );
//   }

//   if (payload.product || payload.service) {
//     const productInfo: any = await Product.findById(payload.product);

//     if (!productInfo) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
//     }
//     if (productInfo.status !== 'active') {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'Product is not active. Cannot review it'
//       );
//     }
//     return productInfo;
//   }

//   if (existingReview) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'You have already reviewed this item'
//     );
//   }

//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     const review = await Review.create([payload], { session });

//     if (payload.product) {
//       await updateProductRating(payload.product.toString(), session);
//       const product = await Product.findById(payload.product);
//       if (product) {
//         await updateSalonRatings(product.salon.toString(), session);
//       }
//     } else if (payload.service) {
//       await updateServiceRating(payload.service.toString(), session);
//       const service = await Service.findById(payload.service);
//       if (service) {
//         await updateSalonRatings(service.salon.toString(), session);
//       }
//     }

//     // const salonOwner = await User.findById(productInfo.host);
//     // if (!salonOwner) {
//     //   throw new ApiError(StatusCodes.NOT_FOUND, 'Salon owner not found');
//     // }

//     // // Send notification to admin
//     // const notificationData = {
//     //   message: `Wow you get review ${salonOwner.name}, email: (${salonOwner.email}), role: ${salonOwner.role}. Salon current status: ${result.status}. Awaiting approval.`,
//     //   type: 'HOST',
//     // receiver: salonOwner._id.toString(),
//     //   metadata: {
//     //     hostId: result.host,
//     //     hostName: salonOwner.name,
//     //     salonId: result._id,
//     //     salonPassportNum: result.passportNum,
//     //     doc: result.doc,
//     //     remarks: result.remarks,
//     //     action: 'new_salon_registration_request',
//     //   },
//     // };

//     // await sendNotifications(notificationData);

//     await session.commitTransaction();
//     return review[0];
//   } catch (error) {
//     await session.abortTransaction();

//     // Handle duplicate key error specifically
//     if (error instanceof Error && 'code' in error && error.code === 11000) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'You have already reviewed this item'
//       );
//     }

//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

const createReview = async (payload: Partial<IReview>): Promise<IReview> => {
  // Validate required fields
  if (!payload.product && !payload.service) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Product or service is required'
    );
  }

  // Check for existing review
  const existingReview = await Review.findOne({
    user: payload.user,
    status: 'active',
    ...(payload.product
      ? { product: payload.product }
      : { service: payload.service }),
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

    // Create the review
    const review = await Review.create([payload], { session });

    // Handle product review
    let salonId: string | undefined;
    let itemName: string = '';
    let itemType: 'product' | 'service' = 'product';

    if (payload.product) {
      const product = await Product.findById(payload.product);
      if (!product) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
      }
      if (product.status !== 'active') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Product is not active. Cannot review it'
        );
      }
      await updateProductRating(payload.product.toString(), session);
      salonId = product.salon.toString();
      itemName = product.name;
      itemType = 'product';
    } else if (payload.service) {
      const service = await Service.findById(payload.service);
      if (!service) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
      }
      if (service.status !== 'active') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Service is not active. Cannot review it'
        );
      }
      await updateServiceRating(payload.service.toString(), session);
      salonId = service.salon.toString();
      itemName = service.name;
      itemType = 'service';
    }

    if (salonId) {
      // Update salon ratings
      await updateSalonRatings(salonId, session);

      // Get salon and owner information
      const salon = await Salon.findById(salonId).populate('host');
      if (!salon || !salon.host) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Salon or salon owner not found'
        );
      }

      // Get reviewer information
      const reviewer = await User.findById(payload.user);
      if (!reviewer) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Reviewer not found');
      }

      // Send notification to salon owner
      const notificationData = {
        message: `New ${payload.rating}⭐ review for your ${itemType} "${itemName}" from ${reviewer.name}`,
        type: 'REVIEW',
        receiver: salon.host,
        metadata: {
          reviewId: review[0]._id,
          salonId: salon._id,
          itemId: payload.product || payload.service,
          rating: payload.rating,
          reviewerName: reviewer.name,
          action: 'new_review_received',
        },
      };

      await sendNotifications(notificationData);
    }

    await session.commitTransaction();
    return review[0];
  } catch (error) {
    await session.abortTransaction();

    if (error instanceof Error && 'code' in error && error.code === 11000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have already reviewed this item'
      );
    }

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

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }

  await Product.findByIdAndUpdate(
    productId,
    {
      rating: roundRating(averageRating),
      reviewCount: reviews.length,
    },
    { session, new: true }
  );
};

const updateServiceRating = async (serviceId: string, session: any) => {
  const reviews = await Review.find({ service: serviceId, status: 'active' });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  const service = await Service.findById(serviceId);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  await Service.findByIdAndUpdate(
    serviceId,
    {
      rating: roundRating(averageRating),
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
    totalReviews > 0 ? roundRating(totalRating / totalReviews) : 0;

  const ratingDistribution: RatingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach(review => {
    const roundedRating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
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
    const {
      product,
      service,
      user,
      status = 'active',
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = filters;

    const query: Record<string, any> = { status };

    if (product) {
      query.product = new mongoose.Types.ObjectId(product);
    }
    if (service) {
      query.service = new mongoose.Types.ObjectId(service);
    }
    if (user) {
      query.user = new mongoose.Types.ObjectId(user);
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [reviews, total] = await Promise.all([
      Review.find(query)
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
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    const meta = await calculateRatingMetadata(query);
    const totalPages = Math.ceil(total / limit);

    return {
      meta,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
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
      const product = await Product.findById(review.product);
      if (product) {
        await updateSalonRatings(product.salon.toString(), session);
      }
    } else if (review.service) {
      await updateServiceRating(review.service.toString(), session);
      const service = await Service.findById(review.service);
      if (service) {
        await updateSalonRatings(service.salon.toString(), session);
      }
    }

    await session.commitTransaction();
    return updatedReview;
  } catch (error) {
    await session.abortTransaction();
    throw error;
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
      const product = await Product.findById(review.product);
      if (product) {
        await updateSalonRatings(product.salon.toString(), session);
      }
    } else if (review.service) {
      await updateServiceRating(review.service.toString(), session);
      const service = await Service.findById(review.service);
      if (service) {
        await updateSalonRatings(service.salon.toString(), session);
      }
    }

    await session.commitTransaction();
    return deletedReview;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
};

export const ReviewService = {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
};
