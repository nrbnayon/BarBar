// src\app\modules\notification\notification.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NotificationService } from './notification.service';
import { notificationFilterableFields, paginationFields } from './notification.constant';
import pick from '../../../shared/pick';

const getUserNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
   const paginationOptions = pick(req.query, paginationFields);
  
  const result = await NotificationService.getUserNotifications(
    user,
    paginationOptions
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getAdminNotifications = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, notificationFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await NotificationService.getAdminNotifications(
    filters,
    paginationOptions
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await NotificationService.markAsRead(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notifications marked as read successfully',
    data: result,
  });
});

const markAdminNotificationsAsRead = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.markAdminNotificationsAsRead();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Admin notifications marked as read successfully',
      data: result,
    });
  }
);

const deleteAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.deleteAllNotifications();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'All notifications deleted successfully',
    data: result,
  });
});

export const NotificationController = {
  getUserNotifications,
  getAdminNotifications,
  markAsRead,
  markAdminNotificationsAsRead,
  deleteAllNotifications,
};

// import { StatusCodes } from 'http-status-codes';
// import catchAsync from '../../../shared/catchAsync';
// import sendResponse from '../../../shared/sendResponse';
// import { NotificationService } from './notification.service';
// import { Request, Response } from 'express';

// const getNotificationToDb = catchAsync(async (req: Request, res: Response) => {
//   const user = req.user;
//   const result = await NotificationService.getNotificationToDb(user);

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: 'Notification retrieved successfully',
//     data: result,
//   });
// });

// const adminNotificationFromDB = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await NotificationService.adminNotification(req.query);

//     sendResponse(res, {
//       statusCode: StatusCodes.OK,
//       success: true,
//       message: 'Notifications Retrieved Successfully',
//       data: result,
//     });
//   }
// );

// const readNotification = catchAsync(async (req: Request, res: Response) => {
//   const user = req.user;
//   const result = await NotificationService.readNotification(user);

//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: 'Notification Read Successfully',
//     data: result,
//   });
// });

// const adminReadNotification = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await NotificationService.adminReadNotification();

//     sendResponse(res, {
//       statusCode: StatusCodes.OK,
//       success: true,
//       message: 'Notification Read Successfully',
//       data: result,
//     });
//   }
// );

// const deleteAllNotifications = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await NotificationService.deleteAllNotifications();

//     sendResponse(res, {
//       statusCode: StatusCodes.OK,
//       success: true,
//       message: 'Notification Deleted Successfully',
//       data: result,
//     });
//   }
// );

// export const NotificationController = {
//   getNotificationToDb,
//   adminNotificationFromDB,
//   readNotification,
//   adminReadNotification,
//   deleteAllNotifications,
// };
