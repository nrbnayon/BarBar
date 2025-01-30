// src/app/modules/schedule/schedule.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { ScheduleController } from './schedule.controller';
import { ScheduleValidation } from './schedule.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/create',
  validateRequest(ScheduleValidation.createScheduleZodSchema),
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  ScheduleController.createSchedule
);

router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  ScheduleController.getAllSchedules
);

router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  ScheduleController.getScheduleById
);

router.patch(
  '/:id',
  validateRequest(ScheduleValidation.updateScheduleZodSchema),
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST),
  ScheduleController.updateSchedule
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  ScheduleController.deleteSchedule
);

export const ScheduleRoutes = router;
