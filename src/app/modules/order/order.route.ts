// src\app\modules\order\order.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { OrderController } from './order.controller';
import { OrderValidation } from './order.validation';

const router = express.Router();

/** ==========================
 *  ORDER CREATION & CHECKOUT
 *  ========================== */
router.post(
  '/create',
  auth(USER_ROLES.USER),
  validateRequest(OrderValidation.createOrderSchema),
  OrderController.createOrder
);

router.post(
  '/checkout-cart',
  auth(USER_ROLES.USER),
  validateRequest(OrderValidation.checkoutCartSchema),
  OrderController.checkoutCart
);

router.post(
  '/checkout-single-salon-items-cart',
  auth(USER_ROLES.USER),
  validateRequest(OrderValidation.checkoutCartSchema),
  OrderController.createOrderFromSingleCart
);

/** ==========================
 *  FETCHING ORDERS
 *  ========================== */

router.get('/my-orders', auth(USER_ROLES.USER), OrderController.getUserOrders);

router.get(
  '/host-orders',
  auth(USER_ROLES.HOST),
  OrderController.getHostOrders
);

router.get(
  '/all-orders',
  auth(USER_ROLES.ADMIN),
  OrderController.getAllOrdersForAdmin
);

router.get(
  '/:orderId',
  auth(USER_ROLES.USER, USER_ROLES.HOST, USER_ROLES.ADMIN),
  OrderController.getOrderById
);

/** ==========================
 *  ORDER STATUS UPDATES
 *  ========================== */

router.patch(
  '/:orderId/status',
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  validateRequest(OrderValidation.updateOrderStatusSchema),
  OrderController.updateOrderStatus
);

/** ==========================
 *  PAYMENT CONFIRMATION
 *  ========================== */
router.patch(
  '/:orderId/confirm-orders-and-cash-payment',
  auth(USER_ROLES.HOST, USER_ROLES.USER),
  validateRequest(OrderValidation.confirmOrderPaymentSchema),
  OrderController.confirmOrderPayment
);

/** ==========================
 *  DELIVERY COMPLETION
 *  ========================== */
router.patch(
  '/:orderId/complete-delivery',
  auth(USER_ROLES.HOST),
  OrderController.completeCartAfterDelivery
);

export const OrderRoutes = router;
