import { model, Schema } from 'mongoose';
import { ICategory } from './category.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default:
        'https://qc.cdn.data.nasdaq.com/assets/images/hero-bkg-764e08457f41a9cdc00603bd399e6195.jpg',
    },
    status: {
      type: String,
      enum: ['active', 'delete'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre('save', async function (next) {
  const isExist = await Category.findOne({ name: this.name });
  if (isExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Category already exist please change the name!'
    );
  }
  next();
});

export const Category = model<ICategory>('Category', categorySchema);
