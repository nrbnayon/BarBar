// src\app\modules\salons\salon.controller.ts
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SalonService } from './salon.service';

const registerSalon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await SalonService.registerSalonInDb(req.body);
      sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message:
          'Salon registered successfully. Please complete the registration with additional details.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

const completeSalonRegistration = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await SalonService.completeSalonRegistration(id, req.body);
      sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message:
          'Salon registration completed successfully! Please wait for admin approval.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// const createSalon = catchAsync(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       console.log('Creating salon with body:', req.body);
//       const result = await SalonService.createSalonInDb(req.body);
//       sendResponse(res, {
//         success: true,
//         statusCode: StatusCodes.OK,
//         message: 'Salon created successfully! Please wait for admin approval.',
//         data: result,
//       });
//     } catch (error) {
//       console.error('Error creating salon:', error);
//       next(error);
//     }
//   }
// );

const getAllSalons = catchAsync(async (req: Request, res: Response) => {
  console.log('Getting all salons with query:', req.query);
  const result = await SalonService.getAllSalons(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Salons retrieved successfully',
    data: result,
  });
});

const getSalonById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log('Getting salon by ID:', id);

  const result = await SalonService.getSalonById(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Salon retrieved successfully',
    data: result,
  });
});

const getMySalon = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  console.log('Getting salon by ID:', hostId);
  const result = await SalonService.getMySalonFromDB(hostId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Salon retrieved successfully',
    data: result,
  });
});

const getSalonsByCategory = catchAsync(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  console.log('Getting salons by category ID:', categoryId);

  const result = await SalonService.getSalonsByCategory(categoryId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Salons retrieved successfully',
    data: result,
  });
});

const updateSalon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const hostId = req.user.id;
    const salonId = req.params.id;
    const updateNewData = req.body;

    console.log('New Update valid data:', updateNewData);

    const result = await SalonService.updateSalon(hostId, req.body, salonId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Salon updated successfully',
      data: result,
    });
  }
);

const deleteSalon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log('Deleting salon with ID:', id);

  const result = await SalonService.deleteSalon(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Salon deleted successfully',
    data: result,
  });
});

const updateSalonStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  const result = await SalonService.updateSalonStatus(id, status, remarks);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `Salon ${status} successfully`,
    data: result,
  });
});

const getPendingSalons = catchAsync(async (req: Request, res: Response) => {
  const result = await SalonService.getPendingSalons(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pending salons retrieved successfully',
    data: result,
  });
});

const getSalonsByStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.params;
  const result = await SalonService.getSalonsByStatus(status as any, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${status} salons retrieved successfully`,
    data: result,
  });
});

const getGenderBasedSalons = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;

  console.log('User ID: ', userId, 'Query: ', req.query);
  const result = await SalonService.getGenderBasedSalons(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gender-based salons retrieved successfully',
    data: result,
  });
});

export const SalonController = {
  // createSalon,
  getMySalon,
  registerSalon,
  completeSalonRegistration,
  getAllSalons,
  getSalonById,
  getSalonsByCategory,
  updateSalon,
  deleteSalon,
  updateSalonStatus,
  getPendingSalons,
  getSalonsByStatus,
  getGenderBasedSalons,
};
