// src\app\modules\wishList\wishList.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { WishListService } from './wishList.service';

const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const productId = req.params.id;

  const result = await WishListService.addToWishlist(userId, productId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product added to wishlist successfully',
    data: result,
  });
});

const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const productId = req.params.id;

  const result = await WishListService.removeFromWishlist(userId, productId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product removed from wishlist successfully',
    data: result,
  });
});

const getWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const filters = req.query;

  const result = await WishListService.getWishlist(userId, filters);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Wishlist retrieved successfully',
    data: result,
  });
});

export const WishListController = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};