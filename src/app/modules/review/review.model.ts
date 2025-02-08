// src/app/modules/review/review.model.ts
import { model, Schema } from 'mongoose';
import { IReview, ReviewModel } from './review.interface';

const reviewSchema = new Schema<IReview, ReviewModel>(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  {
    user: 1,
    product: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      product: { $exists: true },
    },
  }
);

reviewSchema.index(
  {
    user: 1,
    service: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      service: { $exists: true },
    },
  }
);

reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ rating: -1 });

reviewSchema.pre('save', function (next) {
  if (!this.product && !this.service) {
    throw new Error(
      'Review must be associated with either a product or service'
    );
  }
  if (this.product && this.service) {
    throw new Error(
      'Review cannot be associated with both product and service'
    );
  }
  next();
});

reviewSchema.statics.isReviewExists = async function (id: string) {
  return await Review.findById(id);
};

export const Review = model<IReview, ReviewModel>('Review', reviewSchema);