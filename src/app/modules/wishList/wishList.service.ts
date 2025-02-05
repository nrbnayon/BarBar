import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { Product } from '../product/product.model';
import { Wishlist } from './wishList.model';
import { IWishlist, WishlistFilters } from './wishList.interface';

const addToWishlist = async (
  userId: Types.ObjectId,
  productId: string
): Promise<IWishlist> => {
  // Check if product exists and is active
  const product = await Product.findOne({ _id: productId, status: 'active' });
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found or inactive');
  }

  // Check if already in wishlist
  const existingItem = await Wishlist.findOne({
    user: userId,
    product: productId,
  });
  if (existingItem) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Product already in wishlist');
  }

  // Create wishlist item
  const wishlistItem = await Wishlist.create({
    user: userId,
    product: product._id,
    salon: product.salon,
    host: product.host,
  });

  return wishlistItem.populate([
    { path: 'product', select: 'name images price description' },
    { path: 'salon', select: 'name address phone' },
    { path: 'host', select: 'name email' },
  ]);
};

const removeFromWishlist = async (
  userId: Types.ObjectId,
  productId: string
): Promise<IWishlist | null> => {
  const result = await Wishlist.findOneAndDelete({
    user: userId,
    product: productId,
  }).populate([
    { path: 'product', select: 'name images price description' },
    { path: 'salon', select: 'name address phone' },
    { path: 'host', select: 'name email' },
  ]);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Item not found in wishlist');
  }

  return result;
};

const getWishlist = async (
  userId: Types.ObjectId,
  filters: WishlistFilters
) => {
  const { searchTerm, salon, host } = filters;
  const conditions: any[] = [{ user: userId }];

  if (searchTerm) {
    conditions.push({
      $or: [
        { 'product.name': { $regex: searchTerm, $options: 'i' } },
        { 'salon.name': { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  if (salon) {
    conditions.push({ salon });
  }

  if (host) {
    conditions.push({ host });
  }

  const whereConditions = conditions.length > 0 ? { $and: conditions } : {};

  const wishlist = await Wishlist.find(whereConditions)
    .populate({
      path: 'product',
      select: 'name images price description status',
      model: 'Product'
    })
    .populate('salon', 'name address phone')
    .populate('host', 'name email')
    .sort({ createdAt: -1 });

  // Filter out products that are no longer active
  const activeItems = wishlist.filter(
    item => item.product && (item.product as any).status === 'active'
  );

  return activeItems;
};

export const WishListService = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
