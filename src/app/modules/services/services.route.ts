// src/app/modules/services/services.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ServiceController } from './services.controller';
import { ServiceValidation } from './services.validation';
import fileUploadHandler from './../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/create',
  fileUploadHandler(),
  auth(USER_ROLES.HOST),
  ServiceController.createService
);

router.get(
  '/salon/:salonId',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ServiceController.getAllServices
);

router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ServiceController.getServiceById
);

router.patch(
  '/:id',
  auth(USER_ROLES.HOST),
  validateRequest(ServiceValidation.updateServiceZodSchema),
  ServiceController.updateService
);

router.delete(
  '/:id',
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  ServiceController.deleteService
);

export const ServiceRoutes = router;
