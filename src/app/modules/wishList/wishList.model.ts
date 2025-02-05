// src\app\modules\wishList\wishList.model.ts
import { model, Schema } from 'mongoose';
import { IWishlist } from './wishList.interface';

const wishlistSchema = new Schema<IWishlist>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Compound index to prevent duplicate wishlist items
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

export const Wishlist = model<IWishlist>('Wishlist', wishlistSchema);