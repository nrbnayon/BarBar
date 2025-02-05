import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CartController } from './cart.controller';
import { CartValidation } from './cart.validation';

const router = express.Router();

router.post(
  '/add',
  auth(USER_ROLES.USER),
  validateRequest(CartValidation.addToCartSchema),
  CartController.addToCart
);

router.get('/', auth(USER_ROLES.USER), CartController.getCart);

router.patch(
  '/item/:productId',
  auth(USER_ROLES.USER),
  validateRequest(CartValidation.updateCartItemSchema),
  CartController.updateCartItem
);

router.delete(
  '/item/:productId',
  auth(USER_ROLES.USER),
  CartController.removeCartItem
);

router.delete('/clear', auth(USER_ROLES.USER), CartController.clearCart);

export const CartRoutes = router;
