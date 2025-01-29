import { NextFunction, Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { BannerService } from './banner.service';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createBanner = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const value = { ...req.body };
    const result = await BannerService.createBanner(value);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Banner created successfully',
      data: result,
    });
  }
);

const getAllBanners = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.getAllBanners();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banners retrieved successfully',
    data: result,
  });
});

const getSingleBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.getSingleBanner(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner retrieved successfully',
    data: result,
  });
});

const updateBanner = catchAsync(async (req: Request, res: Response) => {
  const bannerId = req.params.id;
  const data = { ...req.body };

  console.log('Updating banner...', data, req.body, bannerId);
  const result = await BannerService.updateBanner(bannerId, data);

  console.log('Updated banner', result);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner updated successfully',
    data: result,
  });
});

const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.deleteBanner(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner deleted successfully',
    data: result,
  });
});

export const BannerController = {
  createBanner,
  getAllBanners,
  getSingleBanner,
  updateBanner,
  deleteBanner,
};
