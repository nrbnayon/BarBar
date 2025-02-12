import { StatusCodes } from 'http-status-codes';
import { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { ICategory } from './category.interface';
import { Category } from './category.model';
import { paginationHelper } from '../../../helpers/paginationHelper';

const createCategoryToDB = async (payload: Partial<ICategory>) => {
  // console.log('Creating category payload...', payload);
  // Validate required fields
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const result = await Category.create(payload);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category not created!');
  }

  return result;
};

const getAllCategory = async (query: Record<string, unknown>) => {
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
      $or: [{ name: { $regex: searchTerm, $options: 'i' } }],
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
  const [categories, total] = await Promise.all([
    Category.find(whereConditions)
      .sort(sortConditions)
      .skip(skip)
      .limit(limitData)
      .lean(),
    Category.countDocuments(whereConditions),
  ]);

  // Format dates and process data
  const formattedCategories = categories.map(category => ({
    ...category,
    createdAt: category.createdAt
      ? new Date(category.createdAt).toISOString().split('T')[0]
      : null,
    updatedAt: category.updatedAt
      ? new Date(category.updatedAt).toISOString().split('T')[0]
      : null,
  }));

  // Calculate status statistics
  const statusStats = await Category.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalCategories = statusStats.reduce(
    (acc, curr) => acc + curr.count,
    0
  );
  const statusRatio = statusStats.reduce((acc, { _id, count }) => {
    if (_id) {
      acc[_id] = {
        count,
        percentage: ((count / totalCategories) * 100).toFixed(2) + '%',
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
      statusRatio,
    },
    data: formattedCategories,
  };
};

const getSingleCategory = async (id: string) => {
  const result = await Category.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found!');
  }

  return result;
};

const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  const result = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found!');
  }

  return result;
};

const deleteCategory = async (id: string) => {
  const result = await Category.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found!');
  }

  return result;
};

export const CategoryService = {
  createCategoryToDB,
  getAllCategory,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
