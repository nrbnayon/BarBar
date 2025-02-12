import express, { NextFunction, Request, Response } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BannerController } from './banner.controller';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { bannerValidation } from './banner.validation';
import getFilePath from '../../../shared/getFilePath';

const router = express.Router();

/**=================================================================
 * @route POST /create-banner
 * @desc Create a new Banner (Admin only)
 * @access Private (Admin)
 =================================================================**/
router.post(
  '/create-banner',
  fileUploadHandler(),
  auth(USER_ROLES.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract the image path if an image was uploaded
      const bannerData = {
        ...req.body,
      };

      if (req.files) {
        const imagePath = getFilePath(req.files, 'images');
        if (imagePath) {
          bannerData.image = imagePath;
        }
      }

      const validatedData =
        bannerValidation.createBannerSchema.parse(bannerData);
      req.body = validatedData;

      return BannerController.createBanner(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**=================================================================
 * @route GET /
 * @desc Get all Banners (Admin, User, and Host access)
 * @access Private (Admin, User, Host)
 =================================================================**/
router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  BannerController.getAllBanners
);

/**=================================================================
 * @route GET /:id
 * @desc Get a single Banner by ID
 * @access Public
 =================================================================**/
router.get('/:id', BannerController.getSingleBanner);

/**=================================================================
 * @route PATCH /:id
 * @desc Update a Banner by ID (Admin only)
 * @access Private (Admin)
 =================================================================**/
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

      const newValidateData =
        bannerValidation.updateBannerSchema.parse(validatedData);
      req.body = newValidateData;

      await BannerController.updateBanner(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**=================================================================
 * @route DELETE /:id
 * @desc Delete a Banner by ID (Admin only)
 * @access Private (Admin)
 =================================================================**/
router.delete('/:id', auth(USER_ROLES.ADMIN), BannerController.deleteBanner);

export const BannerRoutes = router;
