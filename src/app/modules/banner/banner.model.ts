import { model, Schema } from 'mongoose';
import { IBanner } from './banner.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const bannerSchema = new Schema<IBanner>(
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
    type: {
      type: String,
      enum: ['HOST', 'USER'],
      default: 'USER',
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

bannerSchema.pre('save', async function (next) {
  const isExist = await Banner.findOne({ name: this.name });
  if (isExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Banner already exists, please choose a different name!'
    );
  }
  next();
});

export const Banner = model<IBanner>('Banner', bannerSchema);
