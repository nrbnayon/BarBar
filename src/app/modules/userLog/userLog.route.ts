import express from 'express';
import auth from '../../middlewares/auth';
import { UserLogController } from './userLog.controller';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.get(
  '/logs',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  UserLogController.getUserLogs
);

router.get(
  '/active-sessions',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  UserLogController.getActiveSessions
);

router.post(
  '/logout/:sessionId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  UserLogController.logoutSession
);

router.post(
  '/logout-all',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  UserLogController.logoutAllSessions
);

export const UserLogRoutes = router;
