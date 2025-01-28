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

export const UserLogRoutes = router;
