import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { OrderService } from './order.service';

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { items, paymentMethod } = req.body;

  const result = await OrderService.createOrder(userId, items, paymentMethod);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Order created successfully',
    data: result,
  });
});

const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const result = await OrderService.getOrderById(orderId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Order retrieved successfully',
    data: result,
  });
});

const getUserOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await OrderService.getUserOrders(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Orders retrieved successfully',
    data: result,
  });
});

const getHostOrders = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  const result = await OrderService.getHostOrders(hostId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Host orders retrieved successfully',
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, salonId } = req.body;

  const result = await OrderService.updateOrderStatus(orderId, status, salonId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Order status updated successfully',
    data: result,
  });
});

export const OrderController = {
  createOrder,
  getOrderById,
  getUserOrders,
  getHostOrders,
  updateOrderStatus,
};