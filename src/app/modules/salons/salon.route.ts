// src\app\modules\salons\salon.route.ts
import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { SalonController } from './salon.controller';
import { SalonValidation } from './salon.validation';
import getFilePath, { getFilePathMultiple } from '../../../shared/getFilePath';
import validateRequest from '../../middlewares/validateRequest';
const router = express.Router();

// router.post(
//   '/create',
//   fileUploadHandler(),

//   auth(USER_ROLES.HOST),
//   (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const user = req.user;
//       const salonData = {
//         ...req.body,
//         host: user.id,
//       };

//       console.log('Request body:', req.files, salonData);

//       if (req.files) {
//         const imagePath = getFilePath(req.files, 'images');
//         if (imagePath) {
//           salonData.doc = imagePath;
//           salonData.image = imagePath;
//         }
//       }

//       const validatedData =
//         SalonValidation.createSalonZodSchema.parse(salonData);
//       req.body = validatedData;

//       return SalonController.createSalon(req, res, next);
//     } catch (error) {
//       next(error);
//     }
//   }
// );

router.post(
  '/register',
  fileUploadHandler(),
  auth(USER_ROLES.HOST),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const salonData = {
        ...req.body,
        host: user.id,
      };

      if (req.files) {
        const docPath = getFilePathMultiple(req.files, 'doc', 'doc');
        console.log('Get salon document path:', docPath);
        if (docPath) {
          salonData.doc = docPath[0];
        }
      }
      const validatedData =
        SalonValidation.initialSalonZodSchema.parse(salonData);
      req.body = validatedData;

      return SalonController.registerSalon(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Complete salon creation
router.post(
  '/complete/:id',
  fileUploadHandler(),
  auth(USER_ROLES.HOST),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const salonData = { ...req.body };

      if (req.files) {
        const imagePath = getFilePath(req.files, 'image');
        if (imagePath) {
          salonData.image = imagePath;
        }
      }

      const validatedData =
        SalonValidation.completeSalonZodSchema.parse(salonData);
      req.body = validatedData;

      return SalonController.completeSalonRegistration(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/update/:id',
  fileUploadHandler(),
  auth(USER_ROLES.HOST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let updateSalonData = { ...req.body };
      if (req.files) {
        const imagePath = getFilePath(req.files, 'images');
        if (imagePath) {
          updateSalonData.image = imagePath;
        }
      }

      const validatedData =
        SalonValidation.updateSalonZodSchema.parse(updateSalonData);
      req.body = validatedData;
      await SalonController.updateSalon(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/my-salon', auth(USER_ROLES.HOST), SalonController.getMySalon);

router.get(
  '/all',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
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

router.get(
  '/admin/pending',
  auth(USER_ROLES.ADMIN),
  SalonController.getPendingSalons
);

router.get(
  '/status/:status',
  auth(USER_ROLES.ADMIN, USER_ROLES.HOST),
  SalonController.getSalonsByStatus
);

router.patch(
  '/admin/status/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(SalonValidation.updateSalonZodSchema),
  SalonController.updateSalonStatus
);

router.get(
  '/user/gender',
  auth(USER_ROLES.USER),
  SalonController.getGenderBasedSalons
);

router.delete('/:id', auth(USER_ROLES.ADMIN), SalonController.deleteSalon);

export const SalonRoutes = router;
