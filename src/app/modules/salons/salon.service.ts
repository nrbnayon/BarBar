// src/app/modules/salons/salon.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose, { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { ISalon } from './salon.interface';
import { Salon } from './salon.model';
import { Category } from '../category/category.model';

const createSalonInDb = async (payload: ISalon): Promise<ISalon> => {
  console.log('Creating salon with payload:', payload);
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    console.log('Transaction started');

    const result = await Salon.create([payload], { session });

    if (!result.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create salon');
    }

    await session.commitTransaction();
    console.log('Transaction committed successfully');

    return result[0];
  } catch (error) {
    await session.abortTransaction();
    console.error('Transaction aborted:', error);
    throw error;
  } finally {
    await session.endSession();
    console.log('Session ended');
  }
};

const getAllSalons = async (query: Record<string, unknown>) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc',
    ...filterData
  } = query;

  //   const pipeline: any[] = [];
  const conditions: any[] = [];
  //   const matchConditions: any[] = [];

  if (searchTerm) {
    const sanitizedSearchTerm = searchTerm
      .toString()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingCategories = await Category.find({
      name: { $regex: searchTerm.toString(), $options: 'i' },
      status: 'active',
    }).distinct('_id');
    conditions.push({
      $and: [
        { status: 'active' },
        {
          $or: [
            { name: { $regex: sanitizedSearchTerm, $options: 'i' } },
            { address: { $regex: sanitizedSearchTerm, $options: 'i' } },
            { phone: { $regex: sanitizedSearchTerm, $options: 'i' } },
            { category: { $in: matchingCategories } },
          ],
        },
      ],
    });
  }

  if (Object.keys(filterData).length > 0) {
    const filterConditions = Object.entries(filterData).map(
      ([field, value]) => ({
        [field]: value,
      })
    );
    conditions.push({ $and: filterConditions });
  }

  const whereConditions = conditions.length ? { $and: conditions } : {};

  const currentPage = Number(page);
  const pageSize = Number(limit);
  const skip = (currentPage - 1) * pageSize;

  const sortOrder = order === 'desc' ? -1 : 1;
  const sortCondition: { [key: string]: SortOrder } = {
    [sortBy as string]: sortOrder,
  };

  const [salons, total] = await Promise.all([
    Salon.find(whereConditions)
      .populate({
        path: 'host',
        model: 'User',
        select: '-password',
      })
      .populate('category')
      .sort(sortCondition)
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Salon.countDocuments(whereConditions),
  ]);

  return {
    meta: {
      total,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      currentPage,
    },
    data: salons,
  };
};

const getSalonById = async (id: string): Promise<ISalon | null> => {
  console.log('Getting salon by ID:', id);

  const result = await Salon.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: 'users',
        localField: 'host',
        foreignField: '_id',
        as: 'host',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$host' },
    { $unwind: '$category' },
  ]);

  console.log('Salon found:', result[0] ? 'Yes' : 'No');
  return result[0] || null;
};

const getSalonsByCategory = async (categoryId: string) => {
  console.log('Getting salons by category ID:', categoryId);

  const salons = await Salon.find({
    category: new mongoose.Types.ObjectId(categoryId),
    status: 'active',
  }).populate('category');

  console.log(`Found ${salons.length} salons in category`);
  return salons;
};

const updateSalon = async (
  hostId: string,
  payload: Partial<ISalon>,
  salonId: string | undefined = undefined
): Promise<ISalon | null> => {
  console.log(
    'Updating salon for host:',
    hostId,
    salonId,
    'Payload: ',
    payload
  );

  if (!salonId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Salon ID is required');
  }

  const isExist = await Salon.isExistSalonById(salonId);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
  }

  const result = await Salon.findOneAndUpdate({ _id: salonId }, payload, {
    new: true,
  }).populate(['host', 'category']);

  console.log('Salon updated:', result ? 'Yes' : 'No');

  return result;
};

const deleteSalon = async (id: string): Promise<ISalon | null> => {
  console.log('Deleting salon with ID:', id);

  const result = await Salon.findByIdAndDelete(id);

  console.log('Salon deleted:', result ? 'Yes' : 'No');
  return result;
};

export const SalonService = {
  createSalonInDb,
  getAllSalons,
  getSalonById,
  getSalonsByCategory,
  updateSalon,
  deleteSalon,
};
