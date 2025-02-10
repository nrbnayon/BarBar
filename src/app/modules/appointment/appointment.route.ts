// src\app\modules\appointment\appointment.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AppointmentController } from './appointment.controller';
import { AppointmentValidation } from './appointment.validation';

const router = express.Router();

router.post(
  '/create',
  auth(USER_ROLES.USER),
  validateRequest(AppointmentValidation.createAppointmentZodSchema),
  AppointmentController.createAppointment
);

router.get(
  '/available-slots/:salonId/:serviceId/:date',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  AppointmentController.getAvailableTimeSlots
);

router.get(
  '/my-appointments',
  auth(USER_ROLES.USER),
  AppointmentController.getAppointments
);

router.get(
  '/salon/:salonId',
  auth(USER_ROLES.HOST),
  AppointmentController.getSalonAppointments
);

router.patch(
  '/:id/status',
  auth(USER_ROLES.HOST),
  validateRequest(AppointmentValidation.updateAppointmentZodSchema),
  AppointmentController.updateAppointmentStatus
);

router.patch(
  '/:id/reschedule',
  auth(USER_ROLES.USER),
  validateRequest(AppointmentValidation.rescheduleAppointmentZodSchema),
  AppointmentController.rescheduleAppointment
);

router.post(
  '/:id/payment',
  auth(USER_ROLES.USER),
  validateRequest(AppointmentValidation.processPaymentZodSchema),
  AppointmentController.processPayment
);

router.post(
  '/:id/confirm-cash-payment',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  AppointmentController.confirmCashPayment
);

export const AppointmentRoutes = router;
