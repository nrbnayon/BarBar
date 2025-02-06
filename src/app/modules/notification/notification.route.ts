// // src\app\modules\notification\notification.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notification.controller';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  NotificationController.getUserNotifications
);

router.patch(
  '/mark-as-read',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  NotificationController.markAsRead
);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN),
  NotificationController.getAdminNotifications
);

router.patch(
  '/admin/mark-as-read',
  auth(USER_ROLES.ADMIN),
  NotificationController.markAdminNotificationsAsRead
);

router.delete(
  '/admin',
  auth(USER_ROLES.ADMIN),
  NotificationController.deleteAllNotifications
);

export const NotificationRoutes = router;

// import express from 'express';
// import auth from '../../middlewares/auth';
// import { USER_ROLES } from '../../../enums/user';
// import { NotificationController } from './notification.controller';

// const router = express.Router();

// router.get(
//   '/',
//   auth(USER_ROLES.USER),
//   NotificationController.getNotificationToDb
// );

// router.patch(
//   '/',
//   auth(USER_ROLES.USER),
//   NotificationController.readNotification
// );

// router.get(
//   '/admin',
//   auth(USER_ROLES.ADMIN),
//   NotificationController.adminNotificationFromDB
// );

// router.patch(
//   '/admin',
//   auth(USER_ROLES.ADMIN),
//   NotificationController.adminReadNotification
// );

// router.delete(
//   '/delete-all',
//   auth(USER_ROLES.ADMIN),
//   NotificationController.deleteAllNotifications
// );

// export const NotificationRoutes = router;
