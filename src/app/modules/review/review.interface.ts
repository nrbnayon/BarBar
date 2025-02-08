// src/app/modules/review/review.interface.ts
import { Model, Types } from 'mongoose';

export type Rating = 1 | 2 | 3 | 4 | 5;

export type IReview = {
  rating: number;
  review: string;
  user: Types.ObjectId;
  product?: Types.ObjectId;
  service?: Types.ObjectId;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
};

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface RatingMetadata {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
}

export interface ReviewResponse {
  data: IReview[];
  meta: RatingMetadata;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewFilters {
  product?: string;
  service?: string;
  user?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type ReviewModel = {
  isReviewExists(id: string): Promise<IReview | null>;
} & Model<IReview>;