// src/app/modules/salons/salon.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose, { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { ISalon } from './salon.interface';
import { Salon } from './salon.model';
import { Category } from '../category/category.model';
import { User } from '../user/user.model';
import { sendNotifications } from '../../../helpers/notificationHelper';

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

    const sendAdminNotification = async (result: any) => {
      const notificationData = {
        message: `New salon add request from ${result.name} email: (${result.email}), role: ${result.role}. Salon current status: ${result.status}`,
        type: 'ADMIN',
        metadata: {
          userId: result._id,
          salonId: result._id,
          salonPassportNum: result.passportNum,
          salonDocument: result.salonDocument,
          action: 'new_salon_request',
        },
      };

      await sendNotifications(notificationData);
    };

    console.log('Notification send:: ', sendAdminNotification);

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
            {
              'address.locationName': {
                $regex: sanitizedSearchTerm,
                $options: 'i',
              },
            },
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

const updateSalonStatus = async (
  salonId: string,
  status: 'active' | 'inactive' | 'pending' | 'rejected',
  remarks?: string
): Promise<ISalon | null> => {
  const salon = await Salon.findById(salonId);

  if (!salon) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
  }

  const result = await Salon.findByIdAndUpdate(
    salonId,
    {
      status,
      remarks: remarks || '',
      // statusUpdateHistory: [
      //   ...(salon.statusUpdateHistory || []),
      //   {
      //     status,
      //     updatedAt: new Date(),
      //     remarks: remarks || '',
      //   },
      // ],
    },
    { new: true }
  ).populate(['host', 'category']);

  return result;
};

const getPendingSalons = async (query: Record<string, unknown>) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = query;

  const currentPage = Number(page);
  const pageSize = Number(limit);
  const skip = (currentPage - 1) * pageSize;

  const sortOrder = order === 'desc' ? -1 : 1;
  const sortCondition: { [key: string]: SortOrder } = {
    [sortBy as string]: sortOrder,
  };

  const [salons, total] = await Promise.all([
    Salon.find({ status: 'pending' })
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
    Salon.countDocuments({ status: 'pending' }),
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

const getSalonsByStatus = async (
  status: 'active' | 'inactive' | 'pending' | 'rejected',
  query: Record<string, unknown>
) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = query;

  const currentPage = Number(page);
  const pageSize = Number(limit);
  const skip = (currentPage - 1) * pageSize;

  const sortOrder = order === 'desc' ? -1 : 1;
  const sortCondition: { [key: string]: SortOrder } = {
    [sortBy as string]: sortOrder,
  };

  const [salons, total] = await Promise.all([
    Salon.find({ status })
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
    Salon.countDocuments({ status }),
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

const getGenderBasedSalons = async (
  userId: string,
  query: Record<string, unknown>
) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc',
  } = query;

  // Get user's gender from the User model
  const user = await User.findById(userId).select('gender');

  const currentPage = Number(page);
  const pageSize = Number(limit);
  const skip = (currentPage - 1) * pageSize;
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortCondition: { [key: string]: SortOrder } = {
    [sortBy as string]: sortOrder,
  };

  // Initialize base conditions array with active status
  const conditions: any[] = [{ status: 'active' }];

  // Add search conditions if searchTerm exists
  if (searchTerm) {
    const sanitizedSearchTerm = searchTerm
      .toString()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const matchingCategories = await Category.find({
      name: { $regex: searchTerm.toString(), $options: 'i' },
      status: 'active',
    }).distinct('_id');

    conditions.push({
      $or: [
        { name: { $regex: sanitizedSearchTerm, $options: 'i' } },
        {
          'address.locationName': {
            $regex: sanitizedSearchTerm,
            $options: 'i',
          },
        },
        { phone: { $regex: sanitizedSearchTerm, $options: 'i' } },
        { category: { $in: matchingCategories } },
      ],
    });
  }

  // Add gender filter if applicable
  if (user?.gender) {
    const specificGenderFilter =
      user.gender === 'both'
        ? { gender: { $in: ['both', 'male', 'female'] } }
        : { gender: { $in: ['both', user.gender] } };

    const matchingSalons = await Salon.countDocuments({
      $and: [...conditions, specificGenderFilter],
    });

    if (matchingSalons > 0) {
      conditions.push(specificGenderFilter);
    }
  }

  // Combine all conditions with $and
  const whereConditions =
    conditions.length > 1 ? { $and: conditions } : conditions[0];

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

  const wasGenderFiltered = conditions.length > 1;

  return {
    meta: {
      total,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      currentPage,
      wasGenderFiltered,
      userGender: user?.gender || 'not_specified',
    },
    data: salons,
  };
};

export const SalonService = {
  createSalonInDb,
  getAllSalons,
  getSalonById,
  getSalonsByCategory,
  updateSalon,
  deleteSalon,
  updateSalonStatus,
  getPendingSalons,
  getSalonsByStatus,
  getGenderBasedSalons,
};
