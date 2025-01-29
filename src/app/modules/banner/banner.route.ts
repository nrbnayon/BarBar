import express, { NextFunction, Request, Response } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BannerController } from './banner.controller';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { bannerValidation } from './banner.validation';

const router = express.Router();

/**
 * Create a new Banner
 */
router.post(
  '/create-banner',
  fileUploadHandler(),
  auth(USER_ROLES.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract the image path if an image was uploaded
      let image;
      if (req.files && 'image' in req.files && req.files.image[0]) {
        image = `/images/${req.files.image[0].filename}`;
      }

      const bannerData = {
        ...req.body,
        image: image,
      };

      // console.log('New creating banner data: ', bannerData);
      const validatedData =
        bannerValidation.createBannerSchema.parse(bannerData);
      req.body = validatedData;

      return BannerController.createBanner(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all Banners
 */
router.get(
  '/',
  // auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  BannerController.getAllBanners
);

/**
 * Get a single Banner by ID
 */
router.get(
  '/:id',
  BannerController.getSingleBanner
);

/**
 * Update a Banner by ID
 */
router.patch(
  '/:id',
  fileUploadHandler(),
  auth(USER_ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validatedData = { ...req.body };
      console.log(
        'New updating banner data: ',
        validatedData,
        req.body,
        req.files
      );

      if (req.files && 'image' in req.files && req.files.image[0]) {
        validatedData.image = `/images/${req.files.image[0].filename}`;
      }
      console.log('Validated data', validatedData);

      const newValidateData =
        bannerValidation.updateBannerSchema.parse(validatedData);
      req.body = newValidateData;

      await BannerController.updateBanner(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete a Banner by ID
 */
router.delete('/:id', auth(USER_ROLES.ADMIN), BannerController.deleteBanner);

export const BannerRoutes = router;
