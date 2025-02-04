// src/app/modules/review/review.controller.ts
import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { ReviewService } from './review.service';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const payload = {
    ...req.body,
    user: userId,
  };

  const result = await ReviewService.createReview(payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Review created successfully',
    data: result,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    product: req.query.product as string,
    service: req.query.service as string,
    user: req.query.user as string,
    status: req.query.status as string,
  };

  const result = await ReviewService.getReviews(filters);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reviews retrieved successfully',
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const payload = req.body;

  const result = await ReviewService.updateReview(id, userId, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review updated successfully',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await ReviewService.deleteReview(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review deleted successfully',
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
};
