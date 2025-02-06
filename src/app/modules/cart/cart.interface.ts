// src\app\modules\cart\cart.interface.ts
import { Types } from 'mongoose';

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  salon: Types.ObjectId;
  host: Types.ObjectId;
}

export interface ICart {
  user: Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

export type CartFilters = {
  searchTerm?: string;
  status?: string;
  salon?: string;
  minPrice?: number;
  maxPrice?: number;
};
