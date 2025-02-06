// // src\app\modules\notification\notification.service.ts
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Notification } from './notification.model';
import { INotification, INotificationFilters } from './notification.interface';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';

const getUserNotifications = async (
  user: JwtPayload,
  paginationOptions: IPaginationOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const result = await Notification.find({ receiver: user.id })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Notification.countDocuments({ receiver: user.id });
  const unreadCount = await Notification.countDocuments({
    receiver: user.id,
    read: false,
  });

  return {
    meta: {
      page,
      limit,
      total,
      unreadCount,
    },
    data: result,
  };
};

const markAsRead = async (
  user: JwtPayload
): Promise<{ modifiedCount: number }> => {
  const result = await Notification.updateMany(
    { receiver: user.id, read: false },
    { read: true }
  );

  return { modifiedCount: result.modifiedCount };
};

const getAdminNotifications = async (
  filters: INotificationFilters,
  paginationOptions: IPaginationOptions
) => {
  const { searchTerm, type, read, startDate, endDate } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const query: Record<string, any> = { type: 'ADMIN' };

  if (searchTerm) {
    query.message = { $regex: searchTerm, $options: 'i' };
  }

  if (type) {
    query.type = type;
  }

  if (typeof read === 'boolean') {
    query.read = read;
  }

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const result = await Notification.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    ...query,
    read: false,
  });

  return {
    meta: {
      page,
      limit,
      total,
      unreadCount,
    },
    data: result,
  };
};

const markAdminNotificationsAsRead = async (): Promise<{
  modifiedCount: number;
}> => {
  const result = await Notification.updateMany(
    { type: 'ADMIN', read: false },
    { read: true }
  );

  return { modifiedCount: result.modifiedCount };
};

const deleteAllNotifications = async (): Promise<{ deletedCount: number }> => {
  const result = await Notification.deleteMany({ type: 'ADMIN' });
  return { deletedCount: result.deletedCount };
};

const createNotification = async (
  payload: Partial<INotification>
): Promise<INotification> => {
  if (!payload.receiver || !payload.message || !payload.type) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Receiver, message and type are required'
    );
  }

  const result = await Notification.create(payload);
  return result;
};

const getNotificationById = async (
  id: string
): Promise<INotification | null> => {
  const notification = await Notification.findById(id).lean();
  return notification;
};

export const NotificationService = {
  getUserNotifications,
  markAsRead,
  getAdminNotifications,
  markAdminNotificationsAsRead,
  deleteAllNotifications,
  createNotification,
  getNotificationById,
};


// import { JwtPayload } from 'jsonwebtoken';
// import { Notification } from './notification.model';
// import { SortOrder } from 'mongoose';

// const getNotificationToDb = async (user: JwtPayload) => {
//   const result = await Notification.find({ receiver: user.id });

//   const unredCount = await Notification.countDocuments({
//     receiver: user.id,
//     read: false,
//   });

//   const data = {
//     result,
//     unredCount,
//   };

//   return data;
// };

// const readNotification = async (user: JwtPayload) => {
//   const result = await Notification.updateMany(
//     { receiver: user.id },
//     { read: true }
//   );
//   return result;
// };

// const adminNotification = async (query: Record<string, unknown>) => {
//   const { page, limit } = query;

//   // Apply filter conditions

//   const pages = parseInt(page as string) || 1;
//   const size = parseInt(limit as string) || 10;
//   const skip = (pages - 1) * size;

//   // Set default sort order to show new data first

//   const result = await Notification.find()

//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(size)
//     .lean();
//   const total = await Notification.countDocuments();
//   const unread = await Notification.countDocuments({ read: false });

//   const data: any = {
//     result,
//     meta: {
//       page: pages,
//       limit: size,
//       total,
//       unread,
//     },
//   };
//   return data;
// };

// const adminReadNotification = async () => {
//   const result = await Notification.updateMany(
//     { type: 'ADMIN' },
//     { read: true }
//   );
//   return result;
// };

// const deleteAllNotifications = async () => {
//   const result = await Notification.deleteMany({});
//   return result;
// };

// export const NotificationService = {
//   getNotificationToDb,
//   readNotification,
//   adminNotification,
//   adminReadNotification,
//   deleteAllNotifications,
// };
