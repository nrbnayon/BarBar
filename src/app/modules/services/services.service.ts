// src\app\modules\services\services.service.ts
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Service } from './services.model';
import { IService } from './services.interface';
import { Category } from '../category/category.model';
import { Salon } from '../salons/salon.model';
import { Types } from 'mongoose';

const createService = async (payload: IService): Promise<IService> => {
  const result = await Service.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Service not created!');
  }
  return result;
};

const getAllServices = async (filters: Record<string, unknown>) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    ...filterData
  } = filters;

  const pageNumber = Number(page);
  const pageSize = Number(limit);
  const skip = (pageNumber - 1) * pageSize;

  // Initialize base query with active status
  const baseQuery: any = { status: 'active' };

  // Add search conditions if searchTerm exists
  if (searchTerm) {
    const sanitizedSearchTerm = searchTerm
      .toString()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const matchingCategories = await Category.find({
      name: { $regex: sanitizedSearchTerm, $options: 'i' },
      status: 'active',
    }).distinct('_id');

    const matchingSalons = await Salon.find({
      name: { $regex: sanitizedSearchTerm, $options: 'i' },
      status: 'active',
    }).distinct('_id');

    baseQuery.$or = [
      { name: { $regex: sanitizedSearchTerm, $options: 'i' } },
      { description: { $regex: sanitizedSearchTerm, $options: 'i' } },
      { category: { $in: matchingCategories } },
      { salon: { $in: matchingSalons } },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: '$price' },
            regex: sanitizedSearchTerm.replace(/[^0-9.]/g, ''),
            options: 'i',
          },
        },
      },
    ];
  }

  // Add filter conditions
  if (Object.keys(filterData).length > 0) {
    Object.entries(filterData).forEach(([field, value]) => {
      if (field === 'price' && typeof value === 'object') {
        const priceFilter: any = {};
        if ((value as any).min !== undefined) {
          priceFilter.$gte = Number((value as any).min);
        }
        if ((value as any).max !== undefined) {
          priceFilter.$lte = Number((value as any).max);
        }
        baseQuery.price = priceFilter;
      } else if (field === 'category') {
        baseQuery.category = new Types.ObjectId(value as string);
      } else if (field === 'duration') {
        baseQuery.duration = Number(value);
      } else {
        baseQuery[field] = value;
      }
    });
  }

  try {
    const sortField = sortBy as string;
    const sortObject: { [key: string]: 1 | -1 } = {
      [sortField]: sortOrder === 'desc' ? -1 : 1,
    };

    const total = await Service.countDocuments(baseQuery);

    const services = await Service.find(baseQuery)
      .populate({
        path: 'category',
        select: 'name description status',
        match: { status: 'active' },
      })
      .populate({
        path: 'salon',
        select: 'name address phone status',
        match: { status: 'active' },
      })
      .sort(sortObject)
      .skip(skip)
      .limit(pageSize)
      .lean();

    return {
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      data: services,
    };
  } catch (error) {
    console.error('Error in getAllServices:', error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Error retrieving services'
    );
  }
};

const getSalonAllServicesFromDB = async (
  salonId: string,
  filters: Record<string, unknown>
) => {
  const { searchTerm, ...filterData } = filters;
  const conditions: any[] = [{ salon: salonId }];

  if (searchTerm) {
    conditions.push({
      $or: [
        { name: { $regex: searchTerm.toString(), $options: 'i' } },
        { description: { $regex: searchTerm.toString(), $options: 'i' } },
      ],
    });
  }

  if (Object.keys(filterData).length) {
    conditions.push(filterData);
  }

  const result = await Service.find({ $and: conditions })
    .populate('category')
    .lean();

  return result;
};

const getServiceById = async (id: string): Promise<IService | null> => {
  const result = await Service.findById(id).populate('category');
  return result;
};

const updateService = async (
  id: string,
  payload: Partial<IService>
): Promise<IService | null> => {
  const service = await Service.isServiceExists(id);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const result = await Service.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteService = async (id: string): Promise<IService | null> => {
  const result = await Service.findByIdAndDelete(id);
  return result;
};

export const ServiceService = {
  createService,
  getAllServices,
  getSalonAllServicesFromDB,
  getServiceById,
  updateService,
  deleteService,
};