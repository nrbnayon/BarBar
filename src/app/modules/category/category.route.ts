import express, { NextFunction, Request, Response } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { CategoryValidation } from './category.validation';
import { CategoryController } from './category.controller';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import getFilePath from '../../../shared/getFilePath';

const router = express.Router();

router.post(
  '/create-category',
  fileUploadHandler(),
  auth(USER_ROLES.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract the image path if an image was uploaded
      const categoryData = {
        ...req.body,
      };

      if (req.files) {
        const imagePath = getFilePath(req.files, 'image');
        if (imagePath) {
          categoryData.image = imagePath;
        }
      }
      const validatedData =
        CategoryValidation.createCategorySchema.parse(categoryData);
      req.body = validatedData;

      return CategoryController.createCategoryToDB(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  // auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  CategoryController.getAllCategory
);

router.get(
  '/:id',
  //   auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  CategoryController.getSingleCategory
);

router.patch(
  '/:id',
  fileUploadHandler(),
  auth(USER_ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validatedData = { ...req.body };
      if (req.files) {
        const imagePath = getFilePath(req.files, 'image');
        if (imagePath) {
          validatedData.image = imagePath;
        }
      }

      const newValidateData =
        CategoryValidation.updatedCategorySchema.parse(validatedData);
      req.body = newValidateData;
      await CategoryController.updateCategory(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN),
  CategoryController.deleteCategory
);

export const CategoryRoutes = router;
