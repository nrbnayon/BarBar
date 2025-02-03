import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { TransactionService } from './transaction.service';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const processPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { type, itemId, cardId, quantity } = req.body;

  const result = await TransactionService.processPayment(userId, {
    type,
    itemId,
    cardId,
    quantity,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment processed successfully',
    data: result,
  });
});

const getTransactionHistory = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const role = req.user.role.toLowerCase();

    const result = await TransactionService.getTransactionHistory(userId, role);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Transaction history retrieved successfully',
      data: result,
    });
  }
);

const getTransactionById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { transactionId } = req.params;

  const result = await TransactionService.getTransactionById(
    userId,
    transactionId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transaction retrieved successfully',
    data: result,
  });
});

export const TransactionController = {
  processPayment,
  getTransactionHistory,
  getTransactionById,
};
