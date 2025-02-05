// src\app\modules\wishList\wishList.interface.ts
import { Types } from 'mongoose';

export interface IWishlist {
  user: Types.ObjectId;
  product: Types.ObjectId;
  salon: Types.ObjectId;
  host: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WishlistFilters = {
  searchTerm?: string;
  salon?: string;
  host?: string;
};
