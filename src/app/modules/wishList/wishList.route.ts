// src\app\modules\wishList\wishList.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { WishListController } from './wishList.controller';

const router = express.Router();

router.post(
  '/add/:id',
  auth(USER_ROLES.USER),
  WishListController.addToWishlist
);

router.delete(
  '/remove/:id',
  auth(USER_ROLES.USER),
  WishListController.removeFromWishlist
);

router.get('/', auth(USER_ROLES.USER), WishListController.getWishlist);

export const WishlistRoutes = router;
