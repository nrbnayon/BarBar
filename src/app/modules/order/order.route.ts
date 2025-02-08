import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { OrderController } from './order.controller';
import { OrderValidation } from './order.validation';

const router = express.Router();

router.post(
  '/create',
  auth(USER_ROLES.USER),
  validateRequest(OrderValidation.createOrderSchema),
  OrderController.createOrder
);

router.get(
  '/my-orders',
  auth(USER_ROLES.USER),
  OrderController.getUserOrders
);

router.get(
  '/host-orders',
  auth(USER_ROLES.HOST),
  OrderController.getHostOrders
);

router.get(
  '/:orderId',
  auth(USER_ROLES.USER, USER_ROLES.HOST, USER_ROLES.ADMIN),
  OrderController.getOrderById
);

router.patch(
  '/:orderId/status',
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  validateRequest(OrderValidation.updateOrderStatusSchema),
  OrderController.updateOrderStatus
);

export const OrderRoutes = router;