// src\app\modules\schedule\schedule.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { ISchedule } from './schedule.interface';
import { Schedule } from './schedule.model';
import { Salon } from '../salons/salon.model';
import { User } from '../user/user.model';

const createSchedule = async (payload: ISchedule): Promise<ISchedule> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Check if salon exists
    const salon = await Salon.findById(payload.salonId).session(session);
    if (!salon) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
    }

    // Check if user exists
    const user = await User.findById(payload.userId).session(session);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // Create schedule
    const result = await Schedule.create([payload], { session });

    if (!result.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create schedule');
    }

    await session.commitTransaction();
    await session.endSession();

    return result[0];
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

const getAllSchedules = async (query: Record<string, unknown>) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    ...filterData
  } = query;

  const aggregationPipeline = [];

  // Match stage for filters
  if (Object.keys(filterData).length) {
    aggregationPipeline.push({ $match: filterData });
  }

  // Lookup stages
  aggregationPipeline.push(
    {
      $lookup: {
        from: 'salons',
        localField: 'salonId',
        foreignField: '_id',
        as: 'salon',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    }
  );

  // Unwind stages
  aggregationPipeline.push(
    {
      $unwind: {
        path: '$salon',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    }
  );

  // Project stage
  aggregationPipeline.push({
    $project: {
      serviceDate: 1,
      startTime: 1,
      endTime: 1,
      status: 1,
      'salon.name': 1,
      'salon.address': 1,
      'user.name': 1,
      'user.email': 1,
      createdAt: 1,
    },
  });

  // Sort stage
  aggregationPipeline.push({
    $sort: { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 },
  });

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  aggregationPipeline.push({ $skip: skip }, { $limit: Number(limit) });

  const [result, total] = await Promise.all([
    Schedule.aggregate(aggregationPipeline),
    Schedule.countDocuments(filterData),
  ]);

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
    data: result,
  };
};

const getScheduleById = async (id: string): Promise<ISchedule | null> => {
  const result = await Schedule.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: 'salons',
        localField: 'salonId',
        foreignField: '_id',
        as: 'salon',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$salon' },
    { $unwind: '$user' },
    {
      $project: {
        serviceDate: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        'salon.name': 1,
        'salon.address': 1,
        'user.name': 1,
        'user.email': 1,
        createdAt: 1,
      },
    },
  ]);

  return result[0] || null;
};

const updateSchedule = async (
  id: string,
  payload: Partial<ISchedule>
): Promise<ISchedule | null> => {
  const isExist = await Schedule.isExistScheduleById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found');
  }

  const result = await Schedule.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return result;
};

const deleteSchedule = async (id: string): Promise<ISchedule | null> => {
  const result = await Schedule.findByIdAndDelete(id);
  return result;
};

export const ScheduleService = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};
