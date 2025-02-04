// src/app/modules/product/product.interface.ts
import { Model, Types } from 'mongoose';

export type IProduct = {
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
  rating?: number;
  reviewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

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

export type ProductModel = {
  isProductExists(id: string): Promise<IProduct | null>;
} & Model<IProduct>;
