// src/app/modules/services/services.controller.ts
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ServiceService } from './services.service';
import { ServiceValidation } from './services.validation';
import getFilePath from '../../../shared/getFilePath';

const createService = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let serviceData = { ...req.body };

      if (req.files) {
        const imagePath = getFilePath(req.files, 'image');
        if (imagePath) {
          serviceData.image = imagePath;
        }
      }

      const validatedData =
        ServiceValidation.createServiceZodSchema.parse(serviceData);
      req.body = validatedData;

      const result = await ServiceService.createService(req.body);
      sendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: 'Service created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

const getAllServices = catchAsync(async (req: Request, res: Response) => {
  console.log('Getting all services with query:', req.query);
  const result = await ServiceService.getAllServices(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Services retrieved successfully',
    data: result,
  });
});

const getSalonAllServices = catchAsync(async (req: Request, res: Response) => {
  const { salonId } = req.params;
  const result = await ServiceService.getSalonAllServicesFromDB(
    salonId,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Services retrieved successfully',
    data: result,
  });
});

const getServiceById = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceService.getServiceById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service retrieved successfully',
    data: result,
  });
});

const updateService = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let serviceUpdateData = { ...req.body };
      const serviceId = req.params.id;
      if (req.files) {
        const imagePath = getFilePath(req.files, 'image');
        if (imagePath) {
          serviceUpdateData.image = imagePath;
        }
      }

      const validatedData =
        ServiceValidation.updateServiceZodSchema.parse(serviceUpdateData);
      req.body = validatedData;

      const result = await ServiceService.updateService(serviceId, req.body);
      sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Service updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

const deleteService = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceService.deleteService(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service deleted successfully',
    data: result,
  });
});

export const ServiceController = {
  createService,
  getAllServices,
  getSalonAllServices,
  getServiceById,
  updateService,
  deleteService,
};
