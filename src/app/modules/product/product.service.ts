// src/app/modules/product/product.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose, { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IProduct, ProductFilters } from './product.interface';
import { Product } from './product.model';
import { Salon } from '../salons/salon.model';
import { User } from '../user/user.model';

const createProduct = async (payload: IProduct): Promise<IProduct> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Check if salon exists, is active, and belongs to the host
    const salon = await Salon.findOne({
      _id: payload.salon,
      host: payload.host,
      status: 'active',
    });

    if (!salon) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Salon not found, inactive, or you are not authorized to create products for this salon'
      );
    }

    const result = await Product.create([payload], { session });

    if (!result.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create product');
    }

    await session.commitTransaction();

    const populatedProduct = await Product.findById(result[0]._id)
      .populate('salon', 'name address phone')
      .populate('host', 'name email phone');

    return populatedProduct!;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};




const getAllProducts = async (
  filters: ProductFilters,
  paginationOptions: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) => {
  const { searchTerm, price, gender, salon, minRating, ...filterData } =
    filters;
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = paginationOptions;

  const conditions: any[] = [{ status: 'active' }];

  if (searchTerm) {
    conditions.push({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  if (price) {
    const priceCondition: any = {};
    if (price.min !== undefined) priceCondition.$gte = price.min;
    if (price.max !== undefined) priceCondition.$lte = price.max;
    if (Object.keys(priceCondition).length) {
      conditions.push({ price: priceCondition });
    }
  }

  if (gender) {
    conditions.push({ gender });
  }

  if (salon) {
    conditions.push({ salon });
  }

  if (minRating) {
    conditions.push({ rating: { $gte: minRating } });
  }

  const whereConditions = conditions.length > 0 ? { $and: conditions } : {};

  const skip = (page - 1) * limit;
  const sortConditions: { [key: string]: SortOrder } = {
    [sortBy]: sortOrder === 'desc' ? -1 : 1,
  };

  const total = await Product.countDocuments(whereConditions);
  const products = await Product.find(whereConditions)
    .populate('salon', 'name address phone')
    .populate('host', 'name email phone')
    .sort(sortConditions)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: products,
  };
};

const getProductById = async (id: string): Promise<IProduct | null> => {
  const product = await Product.findById(id)
    .populate('salon', 'name address phone')
    .populate('host', 'name email phone');

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }

  return product;
};

const updateProduct = async (
  id: string,
  hostId: string,
  payload: Partial<IProduct>
): Promise<IProduct | null> => {
  const product = await Product.findOne({ _id: id, host: hostId });

  if (!product) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Product not found or you are not authorized to update it'
    );
  }

  const result = await Product.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('salon', 'name address phone')
    .populate('host', 'name email phone');

  return result;
};

const deleteProduct = async (
  id: string,
  hostId: string
): Promise<IProduct | null> => {
  const product = await Product.findOne({ _id: id, host: hostId });

  if (!product) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Product not found or you are not authorized to delete it'
    );
  }

  const result = await Product.findByIdAndUpdate(
    id,
    { status: 'inactive' },
    { new: true }
  );

  return result;
};

const getSalonProducts = async (
  salonId: string,
  filters: ProductFilters,
  paginationOptions: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) => {
  return getAllProducts({ ...filters, salon: salonId }, paginationOptions);
};

const getSimilarProducts = async (productId: string) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }

  // Find products with same category and salon, excluding current product
  const similarProducts = await Product.find({
    _id: { $ne: productId },
    salon: product.salon,
    status: 'active',
  })
    .populate('category', 'name')
    .populate('salon', 'name address price description image')
    .limit(10)
    .sort({ rating: -1, createdAt: -1 });

  // If not enough similar products in same salon, find from other salons
  if (similarProducts.length < 10) {
    const otherProducts = await Product.find({
      _id: { $ne: productId },
      salon: { $ne: product.salon },
      status: 'active',
    })
      .populate('salon', 'name address price description image')
      .limit(10 - similarProducts.length)
      .sort({ rating: -1, createdAt: -1 });

    similarProducts.push(...otherProducts);
  }

  return similarProducts;
};

export const ProductService = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getSalonProducts,
  getSimilarProducts,
};
