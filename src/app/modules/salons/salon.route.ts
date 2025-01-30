// src\app\modules\salons\salon.route.ts
import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { SalonController } from './salon.controller';
import { SalonValidation } from './salon.validation';
const router = express.Router();

router.post(
  '/create',
  fileUploadHandler(),

  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract the image path if an image was uploaded
      const user = req.user;
      const salonData = {
        ...req.body,
        hostId: user.id,
      };
      if (req.files && 'image' in req.files && req.files.image[0]) {
        salonData.image = `/images/${req.files.image[0].filename}`;
      }
      console.log('New creating new salon: ', salonData);
      const validatedData =
        SalonValidation.createSalonZodSchema.parse(salonData);
      req.body = validatedData;

      return SalonController.createSalon(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/update/:id',
  fileUploadHandler(),
  auth(USER_ROLES.HOST, USER_ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validatedData = { ...req.body };
      // Handle image if present
      if (req.files && 'image' in req.files && req.files.image[0]) {
        validatedData.image = `/images/${req.files.image[0].filename}`;
      }
      console.log(
        'Updating salon data: ',
        validatedData,
        ' with id: ',
        req.params.id
      );
      // Validate the data
      SalonValidation.updateSalonZodSchema.parse(validatedData);
      req.body = validatedData;
      await SalonController.updateSalon(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  SalonController.getAllSalons
);

router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  SalonController.getSalonById
);

router.get(
  '/category/:categoryId',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.HOST),
  SalonController.getSalonsByCategory
);

router.delete('/:id', auth(USER_ROLES.ADMIN), SalonController.deleteSalon);

export const SalonRoutes = router;
