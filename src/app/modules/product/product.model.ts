// src/app/modules/product/product.model.ts

import { Schema, model } from 'mongoose';
import { IProduct, ProductModel } from './product.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const productSchema = new Schema<IProduct, ProductModel>(
  {
    salonName: {
      type: String,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      // required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'both'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

productSchema.statics.isProductExists = async function (id: string) {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }
  return product;
};

export const Product = model<IProduct, ProductModel>('Product', productSchema);
