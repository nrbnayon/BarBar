// src/app/modules/review/review.interface.ts
import { Model, Types } from 'mongoose';

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

export type ReviewModel = {
  isReviewExists(id: string): Promise<IReview | null>;
} & Model<IReview>;
