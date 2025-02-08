import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { IncomeController } from './income.controller';
import { IncomeValidation } from './income.validation';

const router = express.Router();

router.post(
  '/create',
  auth(USER_ROLES.ADMIN),
  validateRequest(IncomeValidation.createIncomeSchema),
  IncomeController.createIncome
);

router.get(
  '/host',
  auth(USER_ROLES.HOST),
  IncomeController.getHostIncomes
);

router.get(
  '/salon/:salonId',
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  IncomeController.getSalonIncomes
);

router.get(
  '/report',
  auth(USER_ROLES.HOST),
  validateRequest(IncomeValidation.generateReportSchema),
  IncomeController.generateIncomeReport
);

router.patch(
  '/:incomeId/status',
  auth(USER_ROLES.ADMIN),
  validateRequest(IncomeValidation.updateIncomeStatusSchema),
  IncomeController.updateIncomeStatus
);

router.get(
  '/admin/report',
  auth(USER_ROLES.ADMIN),
  validateRequest(IncomeValidation.generateReportSchema),
  IncomeController.getAdminIncomeReport
);

export const IncomeRoutes = router;