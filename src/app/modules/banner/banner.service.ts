import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IBanner } from './banner.interface';
import { Banner } from './banner.model';
import { SortOrder } from 'mongoose';
import { paginationHelper } from '../../../helpers/paginationHelper';

const createBanner = async (payload: Partial<IBanner>) => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Banner name is required');
  }
  const result = await Banner.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Banner not created!');
  }
  return result;
};

const getAllBanners = async (query: Record<string, unknown>) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    ...filterData
  } = query;

  // Search conditions
  const conditions: any[] = [];

  // Add default status condition
  conditions.push({ status: 'active' });

  if (searchTerm) {
    conditions.push({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { type: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  // Add filter conditions
  if (Object.keys(filterData).length > 0) {
    const filterConditions = Object.entries(filterData).map(
      ([field, value]) => ({
        [field]: value,
      })
    );
    conditions.push({ $and: filterConditions });
  }

  const whereConditions = conditions.length > 0 ? { $and: conditions } : {};

  // Pagination setup
  const {
    skip,
    limit: limitData,
    page: pageData,
  } = paginationHelper.calculatePagination({
    page: Number(page),
    limit: Number(limit),
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
  });

  // Sorting setup
  const sortConditions: { [key: string]: SortOrder } = {
    [sortBy as string]: sortOrder === 'desc' ? -1 : 1,
  };

  // Execute queries in parallel
  const [banners, total] = await Promise.all([
    Banner.find(whereConditions)
      .sort(sortConditions)
      .skip(skip)
      .limit(limitData)
      .lean(),
    Banner.countDocuments(whereConditions),
  ]);

  const formattedBanners = banners.map(banner => ({
    ...banner,
    createdAt: banner.createdAt
      ? new Date(banner.createdAt).toISOString().split('T')[0]
      : null,
    updatedAt: banner.updatedAt
      ? new Date(banner.updatedAt).toISOString().split('T')[0]
      : null,
  }));

  // Calculate statistics
  const [typeStats, statusStats] = await Promise.all([
    Banner.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]),
    Banner.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalBanners = statusStats.reduce((acc, curr) => acc + curr.count, 0);

  const typeRatio = typeStats.reduce((acc, { _id, count }) => {
    if (_id) {
      acc[_id] = {
        count,
        percentage: ((count / totalBanners) * 100).toFixed(2) + '%',
      };
    }
    return acc;
  }, {} as Record<string, { count: number; percentage: string }>);

  const statusRatio = statusStats.reduce((acc, { _id, count }) => {
    if (_id) {
      acc[_id] = {
        count,
        percentage: ((count / totalBanners) * 100).toFixed(2) + '%',
      };
    }
    return acc;
  }, {} as Record<string, { count: number; percentage: string }>);

  return {
    meta: {
      page: pageData,
      limit: limitData,
      total,
      totalPages: Math.ceil(total / limitData),
      typeRatio,
      statusRatio,
    },
    data: formattedBanners,
  };
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
