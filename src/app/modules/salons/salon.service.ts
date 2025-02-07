// src/app/modules/salons/salon.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose, { SortOrder } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { DEFAULT_BUSINESS_HOURS, ISalon } from './salon.interface';
import { Salon } from './salon.model';
import { Category } from '../category/category.model';
import { User } from '../user/user.model';
import { sendNotifications } from '../../../helpers/notificationHelper';
import { logger } from '../../../shared/logger';

// const createSalonInDb = async (payload: ISalon): Promise<ISalon> => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();
//     console.log('Transaction started');

//     const result = await Salon.create([payload], { session });

//     if (!result.length) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create salon');
//     }

//     const salonOwner = await User.findById(payload.host);
//     if (!salonOwner) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Salon owner not found');
//     }

//     const sendAdminNotification = async (result: any, salonOwner: any) => {
//       const notificationData = {
//         message: `New salon add request from ${salonOwner.name}, email: (${salonOwner.email}), role: ${salonOwner.role}. Salon current status: ${result.status}`,
//         type: 'ADMIN',
//         metadata: {
//           hostId: result.host,
//           hostName: salonOwner.name,
//           salonId: result._id,
//           salonPassportNum: result.passportNum,
//           doc: result.doc,
//           remarks: result.remarks,
//           action: 'new_salon_add_request',
//         },
//       };
//       await sendNotifications(notificationData);
//     };

//     await sendAdminNotification(result[0], salonOwner);
//     await session.commitTransaction();
//     logger.info('Transaction committed successfully');
//     return result[0];
//   } catch (error) {
//     await session.abortTransaction();
//     logger.error('Transaction aborted:', error);
//     throw error;
//   } finally {
//     await session.endSession();
//   }
// };

const registerSalonInDb = async (payload: Partial<ISalon>): Promise<ISalon> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await Salon.create(
      [
        {
          ...payload,
          status: 'pending',
          remarks: 'Initial registration',
        },
      ],
      { session }
    );

    if (!result.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to register salon');
    }

    await session.commitTransaction();
    return result[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const completeSalonRegistration = async (
  salonId: string,
  payload: Partial<ISalon>
): Promise<ISalon | null> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const salon = await Salon.findById(salonId);
    if (!salon) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
    }

    // Set default business hours if not provided
    if (!payload.businessHours || payload.businessHours.length === 0) {
      payload.businessHours = DEFAULT_BUSINESS_HOURS;
    }

    const result = await Salon.findByIdAndUpdate(
      salonId,
      { ...payload },
      { new: true, session }
    ).populate(['host', 'category']);

    if (!result) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to complete salon registration'
      );
    }

    const salonOwner = await User.findById(result.host);
    if (!salonOwner) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon owner not found');
    }

    // Send notification to admin
    const notificationData = {
      message: `New salon approval request from ${salonOwner.name}, email: (${salonOwner.email}), role: ${salonOwner.role}. Salon current status: ${result.status}. Awaiting approval.`,
      type: 'ADMIN',
      metadata: {
        hostId: result.host,
        hostName: salonOwner.name,
        salonId: result._id,
        salonPassportNum: result.passportNum,
        doc: result.doc,
        remarks: result.remarks,
        action: 'new_salon_registration_request',
      },
    };

    await sendNotifications(notificationData);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
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

const getMySalonFromDB = async (id: string): Promise<ISalon | null> => {
  const result = await Salon.aggregate([
    { $match: { host: new mongoose.Types.ObjectId(id) } },
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
  console.log(
    `Updating salon status. Salon ID: ${salonId}, New Status: ${status}`
  );

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
  }

  const statusMessages: Record<typeof status, string> = {
    active: 'approved and activated',
    inactive: 'marked as inactive',
    pending: 'placed under review',
    rejected: 'rejected after review',
  };

  const result = await Salon.findByIdAndUpdate(
    salonId,
    { status, remarks: remarks || '' },
    { new: true }
  ).populate(['host', 'category']);

  if (!result) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update salon status'
    );
  }

  const salonOwner = await User.findById(result.host);
  if (!salonOwner) {
    console.warn(`Warning: Salon owner not found for salon ID ${salonId}`);
  }

  const notificationMessage = `Your salon has been ${statusMessages[status]} by the admin after document verification.`;

  const notificationData = {
    message: notificationMessage,
    type: 'HOST',
    receiver: result.host,
    metadata: {
      remarks:
        remarks || notificationMessage || 'No additional remarks provided.',
      action:
        status === 'active' ? 'accepted_your_salon' : 'updated_salon_status',
    },
  };

  await sendNotifications(notificationData);
  console.log('Notification sent to salon owner:', notificationData);

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
  // createSalonInDb,
  registerSalonInDb,
  completeSalonRegistration,
  getMySalonFromDB,
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
