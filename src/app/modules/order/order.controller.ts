// src\app\modules\order\order.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { OrderService } from './order.service';
import ApiError from '../../../errors/ApiError';
import { Salon } from '../salons/salon.model';

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

const confirmOrderPayment = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  const { orderId } = req.params;
  const { salonId } = req.body;

  const result = await OrderService.confirmOrderPaymentFromDB(
    hostId,
    orderId,
    salonId,
    // req.body,
    req.user.role
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Order delivered and cash payment successfully',
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

  const hostId = req.user.id;
  const hostSalon = await Salon.findOne({ host: hostId });
  if (!hostSalon) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found for this host');
  }
  if (salonId && salonId !== hostSalon._id.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only confirm orders for your own salon'
    );
  }

  const result = await OrderService.updateOrderStatus(
    orderId,
    status,
    hostSalon._id.toString()
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Order confirm successfully',
    data: result,
  });
});

const checkoutCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { paymentMethod } = req.body;

  const result = await OrderService.createOrderFromCart(userId, paymentMethod);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Order created successfully from cart',
    data: result,
  });
});

const createOrderFromSingleCart = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { paymentMethod } = req.body;

    const result = await OrderService.createOrderFromSingleCart(
      userId,
      paymentMethod
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: 'Order created successfully from cart',
      data: result,
    });
  }
);

const completeCartAfterDelivery = catchAsync(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user.id;

    await OrderService.completeCartAfterDelivery(orderId, userId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Order delivery completed and cart marked as completed',
    });
  }
);

export const OrderController = {
  createOrder,
  getOrderById,
  getUserOrders,
  getHostOrders,
  updateOrderStatus,
  checkoutCart,
  confirmOrderPayment,
  createOrderFromSingleCart,
  completeCartAfterDelivery,
};
