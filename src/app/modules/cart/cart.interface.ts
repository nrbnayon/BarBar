// src\app\modules\cart\cart.interface.ts
import { Types } from 'mongoose';

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  salon: Types.ObjectId;
  host: Types.ObjectId;
  estimatedDeliveryStart: Date;
  estimatedDeliveryEnd: Date;
}

export interface ICart {
  user: Types.ObjectId;
  salon?: Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  deliveryFee: number;
  estimatedDeliveryStart?: Date;
  estimatedDeliveryEnd?: Date;
  status: 'active' | 'completed' | 'cancelled' | 'pending';
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
