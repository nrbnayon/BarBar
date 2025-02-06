// src\app\modules\payment\payment.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentController } from './payment.controller';
import { PaymentValidation } from './payment.validation';

const router = express.Router();

// Create payment route
router.post(
  '/create',
  auth(USER_ROLES.USER),
  validateRequest(PaymentValidation.createPaymentSchema),
  PaymentController.createPayment
);

// Confirm payment route
router.post(
  '/confirm',
  auth(USER_ROLES.USER),
  validateRequest(PaymentValidation.confirmPaymentSchema),
  PaymentController.confirmPayment
);

// Get user payments route
router.get('/user', auth(USER_ROLES.USER), PaymentController.getUserPayments);

// Get host payments route
router.get('/host', auth(USER_ROLES.HOST), PaymentController.getHostPayments);

router.get('/', auth(USER_ROLES.ADMIN), PaymentController.getAllPayments);

export const PaymentRoutes = router;