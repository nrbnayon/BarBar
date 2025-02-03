import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TransactionController } from './transaction.controller';
import { TransactionValidation } from './transaction.validation';

const router = express.Router();

router.post(
  '/process',
  auth(USER_ROLES.USER),
  validateRequest(TransactionValidation.processPaymentSchema),
  TransactionController.processPayment
);

router.get(
  '/history',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  TransactionController.getTransactionHistory
);

router.get(
  '/:transactionId',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  TransactionController.getTransactionById
);

export const TransactionRoutes = router;
