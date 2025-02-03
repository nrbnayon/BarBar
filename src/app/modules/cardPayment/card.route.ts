// src\app\modules\cardPayment\card.route.ts
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CardController } from './card.controller';
import { CardValidation } from './card.validation';

const router = express.Router();

router.post(
  '/add',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  validateRequest(CardValidation.cardValidationSchema),
  CardController.addCard
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  CardController.getAllCards
);

router.get(
  '/:cardId',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  CardController.getCardById
);

router.patch(
  '/:cardId',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  validateRequest(CardValidation.updateCardValidationSchema),
  CardController.updateCard
);

router.delete(
  '/:cardId',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  CardController.deleteCard
);

router.patch(
  '/:cardId/set-default',
  auth(USER_ROLES.USER, USER_ROLES.HOST),
  CardController.setDefaultCard
);

export const CardRoutes = router;
