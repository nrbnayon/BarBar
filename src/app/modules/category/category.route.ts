import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import getFilePath from '../../../shared/getFilePath';
import { USER_ROLES } from '../../../enums/user';
import { CategoryValidation } from './category.validation';
import { CategoryController } from './category.controller';

const router = express.Router();

/**===============================================================
 * @route POST /create-category
 * @desc Create a new category (Admin only)
 * @access Private (Admin)
 =================================================================*/
router.post(
  '/create-category',
  fileUploadHandler(),
  auth(USER_ROLES.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryData = { ...req.body };
      if (req.files) {
        const imagePath = getFilePath(req.files, 'images');
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

/**===============================================================
 * @route GET /
 * @desc Get all categories (Admin, User, and Host access)
 * @access Private (Admin, User, Host)
 =================================================================*/
router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  CategoryController.getAllCategory
);

/**===============================================================
 * @route GET /:id
 * @desc Get a single category by ID (Admin, User, and Host access)
 * @access Private (Admin, User, Host)
 =================================================================*/
router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  CategoryController.getSingleCategory
);

/**=================================================================
 * @route PATCH /:id
 * @desc Update category by ID (Admin only)
 * @access Private (Admin)
 =================================================================*/
router.patch(
  '/:id',
  fileUploadHandler(),
  auth(USER_ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validatedData = { ...req.body };
      if (req.files) {
        const imagePath = getFilePath(req.files, 'images');
        if (imagePath) {
          validatedData.image = imagePath;
        }
      }
      const newValidatedData =
        CategoryValidation.updatedCategorySchema.parse(validatedData);
      req.body = newValidatedData;
      await CategoryController.updateCategory(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**=================================================================
 * @route DELETE /:id
 * @desc Delete category by ID (Admin only)
 * @access Private (Admin)
=================================================================**/
router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN),
  CategoryController.deleteCategory
);

export const CategoryRoutes = router;

// import express, { NextFunction, Request, Response } from 'express';
// import validateRequest from '../../middlewares/validateRequest';
// import auth from '../../middlewares/auth';
// import { USER_ROLES } from '../../../enums/user';
// import { CategoryValidation } from './category.validation';
// import { CategoryController } from './category.controller';
// import fileUploadHandler from '../../middlewares/fileUploadHandler';
// import getFilePath from '../../../shared/getFilePath';

// const router = express.Router();

// router.post(
//   '/create-category',
//   fileUploadHandler(),
//   auth(USER_ROLES.ADMIN),
//   (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const categoryData = {
//         ...req.body,
//       };

//       if (req.files) {
//         const imagePath = getFilePath(req.files, 'images');
//         if (imagePath) {
//           categoryData.image = imagePath;
//         }
//       }
//       const validatedData =
//         CategoryValidation.createCategorySchema.parse(categoryData);
//       req.body = validatedData;

//       return CategoryController.createCategoryToDB(req, res, next);
//     } catch (error) {
//       next(error);
//     }
//   }
// );

// router.get(
//   '/',
//   // auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
//   CategoryController.getAllCategory
// );

// router.get(
//   '/:id',
//   //   auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
//   CategoryController.getSingleCategory
// );

// router.patch(
//   '/:id',
//   fileUploadHandler(),
//   auth(USER_ROLES.ADMIN),
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       let validatedData = { ...req.body };
//       if (req.files) {
//         const imagePath = getFilePath(req.files, 'images');
//         if (imagePath) {
//           validatedData.image = imagePath;
//         }
//       }

//       const newValidateData =
//         CategoryValidation.updatedCategorySchema.parse(validatedData);
//       req.body = newValidateData;
//       await CategoryController.updateCategory(req, res, next);
//     } catch (error) {
//       next(error);
//     }
//   }
// );

// router.delete(
//   '/:id',
//   auth(USER_ROLES.ADMIN),
//   CategoryController.deleteCategory
// );

// export const CategoryRoutes = router;
