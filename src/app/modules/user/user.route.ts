// src\app\modules\user\user.route.ts
import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import getFilePath from '../../../shared/getFilePath';
const router = express.Router();

router.post(
  '/create-user',
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData = {
        ...req.body,
      };

      if (req.files) {
        const imagePath = getFilePath(req.files, 'image');
        if (imagePath) {
          userData.image = imagePath;
        }
      }

      // Validate the combined data
      const validatedData = UserValidation.createUserZodSchema.parse(userData);
      req.body = validatedData;

      return UserController.createUser(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/update-profile',
  fileUploadHandler(),
  auth(USER_ROLES.USER, USER_ROLES.HOST, USER_ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validatedData = { ...req.body };

      // Handle image if present
      if (req.files) {
        const imagePath = getFilePath(req.files, 'image');
        if (imagePath) {
          validatedData.image = imagePath;
        }
      }
      const validatedUserData =
        UserValidation.updateZodSchema.parse(validatedData);

      req.body = validatedUserData;

      await UserController.updateProfile(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/user',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  UserController.getUserProfile
);

router.get(
  '/get-all-users',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  UserController.getAllUser
);

router.get(
  '/get-all-users/:id',
  auth(USER_ROLES.ADMIN),
  UserController.getSingleUser
);

router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  UserController.getUserProfile
);

// Get online users route
router.get(
  '/online-users',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.HOST),
  UserController.getOnlineUsers
);

// Update online status route
router.patch(
  '/online-status',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.HOST),
  UserController.updateOnlineStatus
);

export const UserRoutes = router;
