// src/app/modules/services/services.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { ServiceController } from './services.controller';
import fileUploadHandler from './../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/create',
  fileUploadHandler(),
  auth(USER_ROLES.HOST),
  ServiceController.createService
);

router.get(
  '/all',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ServiceController.getAllServices
);
router.get(
  '/salon/:salonId',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ServiceController.getSalonAllServices
);

router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ServiceController.getServiceById
);

router.patch(
  '/update/:id',
  fileUploadHandler(),
  auth(USER_ROLES.HOST),
  ServiceController.updateService
);

router.delete(
  '/delete/:id',
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  ServiceController.deleteService
);

export const ServiceRoutes = router;
