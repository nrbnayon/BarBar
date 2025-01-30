// src/app/modules/salons/salon.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose, { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { ISalon } from './salon.interface';
import { Salon } from './salon.model';
import { JwtPayload } from 'jsonwebtoken';
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

// const getAllSalons = async (query: Record<string, unknown>) => {
//   console.log('Getting all salons with query:', query);

//   const {
//     searchTerm,
//     page = 1,
//     limit = 10,
//     sortBy = 'createdAt',
//     sortOrder = 'desc',
//     ...filterData
//   } = query;

//   const aggregationPipeline = [];
//   const matchStage: any = {};

//   if (searchTerm) {
//     matchStage.$or = [
//       { name: { $regex: searchTerm, $options: 'i' } },
//       { address: { $regex: searchTerm, $options: 'i' } },
//       { phone: { $regex: searchTerm, $options: 'i' } },
//     ];
//   }

//   Object.entries(filterData).forEach(([field, value]) => {
//     matchStage[field] = value;
//   });

//   if (Object.keys(matchStage).length > 0) {
//     aggregationPipeline.push({ $match: matchStage });
//   }

//   // Add lookups and other pipeline stages
//   aggregationPipeline.push(
//     {
//       $lookup: {
//         from: 'users',
//         localField: 'host',
//         foreignField: '_id',
//         as: 'host',
//       },
//     },
//     {
//       $lookup: {
//         from: 'categories',
//         localField: 'category',
//         foreignField: '_id',
//         as: 'category',
//       },
//     },
//     { $unwind: '$host' },
//     { $unwind: '$category' }
//   );

//   const skip = (Number(page) - 1) * Number(limit);
//   aggregationPipeline.push(
//     {
//       $sort: {
//         [sortBy as string]: sortOrder === 'desc' ? (-1 as -1) : (1 as 1),
//       },
//     },
//     { $skip: skip },
//     { $limit: Number(limit) }
//   );

//   console.log(
//     'Executing aggregation pipeline:',
//     JSON.stringify(aggregationPipeline, null, 2)
//   );

//   const [result, total] = await Promise.all([
//     Salon.aggregate(aggregationPipeline),
//     Salon.countDocuments(matchStage),
//   ]);

//   console.log(`Found ${result.length} salons out of ${total} total`);

//   return {
//     meta: {
//       page: Number(page),
//       limit: Number(limit),
//       total,
//     },
//     data: result,
//   };
// };

const getAllSalons = async (query: Record<string, unknown>) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc',
    ...filterData
  } = query;

  // Search conditions
  const conditions: any[] = [];

  if (searchTerm) {
    // First, find matching category IDs
    const matchingCategories = await Category.find({
      name: { $regex: searchTerm.toString(), $options: 'i' },
      status: 'active',
    }).distinct('_id');
    conditions.push({
      $and: [
        { status: 'active' },
        {
          $or: [
            { name: { $regex: searchTerm.toString(), $options: 'i' } },
            { address: { $regex: searchTerm.toString(), $options: 'i' } },
            { phone: { $regex: searchTerm.toString(), $options: 'i' } },
            { category: { $in: matchingCategories } },
          ],
        },
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
  host: JwtPayload,
  payload: Partial<ISalon>,
  salonId: string | undefined = undefined
): Promise<ISalon | null> => {
  console.log('Updating salon for host:', host, salonId);
  console.log('Update payload:', payload);

  if (!salonId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Salon ID is required');
  }

  const isExist = await Salon.isExistSalonById(salonId);
  console.log('Is salon exist? : ', isExist);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
  }

  const result = await Salon.findOneAndUpdate(
    { _id: salonId || host.id },
    payload,
    {
      new: true,
    }
  ).populate(['host', 'category']);

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
