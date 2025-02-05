import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CartService } from './cart.service';

const addToCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  const result = await CartService.addToCart(userId, productId, quantity);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product added to cart successfully',
    data: result,
  });
});

const getCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CartService.getCart(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Cart retrieved successfully',
    data: result,
  });
});

const updateCartItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { productId } = req.params;
  const { quantity } = req.body;

  const result = await CartService.updateCartItem(userId, productId, quantity);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Cart item updated successfully',
    data: result,
  });
});

const removeCartItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { productId } = req.params;

  const result = await CartService.removeCartItem(userId, productId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Cart item removed successfully',
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  await CartService.clearCart(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Cart cleared successfully',
  });
});

export const CartController = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
