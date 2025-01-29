import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IBanner } from './banner.interface';
import { Banner } from './banner.model';

const createBanner = async (payload: Partial<IBanner>) => {
  // console.log('Creating banner payload...', payload);
  // Validate required fields
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Banner name is required');
  }

  const result = await Banner.create(payload);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Banner not created!');
  }

  return result;
};

const getAllBanners = async () => {
  const result = await Banner.find({ status: 'active' }).sort({
    createdAt: -1,
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Banners not found!');
  }

  return result;
};

const getSingleBanner = async (id: string) => {
  const result = await Banner.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Banner not found!');
  }

  return result;
};

const updateBanner = async (id: string, payload: Partial<IBanner>) => {
  const result = await Banner.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Banner not found!');
  }

  return result;
};

const deleteBanner = async (id: string) => {
  const result = await Banner.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Banner not found!');
  }

  return result;
};

export const BannerService = {
  createBanner,
  getAllBanners,
  getSingleBanner,
  updateBanner,
  deleteBanner,
};
