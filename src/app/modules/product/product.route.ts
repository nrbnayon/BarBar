// src/app/modules/product/product.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ProductController } from './product.controller';
import { ProductValidation } from './product.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/create',
  auth(USER_ROLES.HOST),
  fileUploadHandler(),
  validateRequest(ProductValidation.createProductSchema),
  ProductController.createProduct
);

router.get(
  '/all',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ProductController.getAllProducts
);

router.get(
  '/salon/:salonId',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ProductController.getSalonProducts
);

router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.USER),
  ProductController.getProductById
);

router.patch(
  '/:id',
  auth(USER_ROLES.HOST),
  fileUploadHandler(),
  validateRequest(ProductValidation.updateProductSchema),
  ProductController.updateProduct
);

router.get(
  '/similar/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  ProductController.getSimilarProducts
);

router.delete(
  '/:id',
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  ProductController.deleteProduct
);

export const ProductRoutes = router;
