// src\app\modules\income\income.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IncomeService } from './income.service';

const createIncome = catchAsync(async (req: Request, res: Response) => {
  const result = await IncomeService.createIncome(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Income record created successfully',
    data: result,
  });
});

const getHostIncomes = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  const result = await IncomeService.getHostIncomes(hostId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Host incomes retrieved successfully',
    data: result,
  });
});

const getSalonIncomes = catchAsync(async (req: Request, res: Response) => {
  const { salonId } = req.params;
  const result = await IncomeService.getSalonIncomes(salonId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Salon incomes retrieved successfully',
    data: result,
  });
});

const generateIncomeReport = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  const { period, startDate, endDate } = req.query;

  const result = await IncomeService.generateIncomeReport(
    hostId,
    period as any,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Income report generated successfully',
    data: result,
  });
});

const generateDetailedIncomeReport = catchAsync(
  async (req: Request, res: Response) => {
    const hostId = req.user.id;
    const { period, startDate, endDate } = req.query;

    const result = await IncomeService.generateDetailedIncomeReport(
      hostId,
      period as any,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Detailed income report generated successfully',
      data: result,
    });
  }
);

const updateIncomeStatus = catchAsync(async (req: Request, res: Response) => {
  const { incomeId } = req.params;
  const { status } = req.body;

  const result = await IncomeService.updateIncomeStatus(incomeId, status);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Income status updated successfully',
    data: result,
  });
});

const getAdminIncomeReport = catchAsync(async (req: Request, res: Response) => {
  const { period, startDate, endDate } = req.query;

  const result = await IncomeService.getAdminIncomeReport(
    period as any,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Admin income report generated successfully',
    data: result,
  });
});

export const IncomeController = {
  createIncome,
  getHostIncomes,
  getSalonIncomes,
  generateIncomeReport,
  generateDetailedIncomeReport,
  updateIncomeStatus,
  getAdminIncomeReport,
};
