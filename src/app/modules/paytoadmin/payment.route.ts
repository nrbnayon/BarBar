// src\app\modules\paytoadmin\payment.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentController } from './payment.controller';
import { PaymentValidation } from './payment.validation';

const router = express.Router();

router.post(
  '/create-payment-intent',
  auth(USER_ROLES.USER),
  validateRequest(PaymentValidation.createPaymentIntentSchema),
  PaymentController.createPaymentIntent
);

router.post(
  '/create-checkout-session',
  auth(USER_ROLES.USER),
  PaymentController.createCheckoutSession
);

router.get(
  '/history',
  auth(USER_ROLES.USER, USER_ROLES.HOST, USER_ROLES.ADMIN),
  PaymentController.getPaymentHistory
);

export const AdminPaymentRoutes = router;