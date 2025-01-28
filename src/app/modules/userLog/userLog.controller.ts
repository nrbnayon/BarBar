import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { UserLogService } from './userLog.service';
import sendResponse from '../../../shared/sendResponse';

const getUserLogs = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await UserLogService.getUserLogs(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User logs retrieved successfully',
    data: result,
  });
});

export const UserLogController = {
  getUserLogs,
};
