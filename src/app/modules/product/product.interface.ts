// src/app/modules/product/product.interface.ts
import { Model, Types, Document, Query } from 'mongoose';

export interface ReviewComment {
  id: string;
  user: {
    id: string;
    name: string;
  };
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface RatingDistribution {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

export interface RatingStats {
  average: number;
  total: number;
  distribution: RatingDistribution;
  recentReviews: ReviewComment[];
}

export interface IPopulatedUser {
  _id: Types.ObjectId;
  name: string;
}

export interface IProduct {
  salonName: string;
  name: string;
  images: string[];
  description: string;
  price: number;
  quantity: number;
  salon: Types.ObjectId;
  host: Types.ObjectId;
  gender: 'male' | 'female' | 'both';
  status: 'active' | 'inactive';
  rating?: RatingStats;
  reviewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductFilters = {
  searchTerm?: string;
  price?: {
    min?: number;
    max?: number;
  };
  gender?: 'male' | 'female' | 'both';
  salon?: string;
  minRating?: number;
};

export interface ProductModel extends Model<IProduct> {
  isProductExists(id: string): Promise<IProduct | null>;
}
