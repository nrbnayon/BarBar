import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { BankAccountController } from './bankAccount.controller';
import { BankAccountValidation } from './bankAccount.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/add',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  fileUploadHandler(),
  validateRequest(BankAccountValidation.bankAccountValidationSchema),
  BankAccountController.addBankAccount
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  BankAccountController.getAllBankAccounts
);

router.get(
  '/:accountId',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  BankAccountController.getBankAccountById
);

router.patch(
  '/:accountId',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  fileUploadHandler(),
  validateRequest(BankAccountValidation.updateBankAccountValidationSchema),
  BankAccountController.updateBankAccount
);

router.delete(
  '/:accountId',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  BankAccountController.deleteBankAccount
);

router.patch(
  '/:accountId/set-default',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  BankAccountController.setDefaultBankAccount
);

router.patch(
  '/:accountId/status',
  auth(USER_ROLES.ADMIN),
  validateRequest(BankAccountValidation.updateBankAccountStatusSchema),
  BankAccountController.updateBankAccountStatus
);

export const BankAccountRoutes = router;