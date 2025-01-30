// src/app/modules/schedule/schedule.controller.ts
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ScheduleService } from './schedule.service';

const createSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Creating schedule with body:', req.body);
      const result = await ScheduleService.createSchedule(req.body);
      sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Schedule created successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error creating schedule:', error);
      next(error);
    }
  }
);

const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
  console.log('Getting all schedules with query:', req.query);
  const result = await ScheduleService.getAllSchedules(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Schedules retrieved successfully',
    data: result,
  });
});

const getScheduleById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log('Getting schedule by ID:', id);

  const result = await ScheduleService.getScheduleById(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Schedule retrieved successfully',
    data: result,
  });
});

const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log('Updating schedule:', id, 'with data:', req.body);

  const result = await ScheduleService.updateSchedule(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Schedule updated successfully',
    data: result,
  });
});

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log('Deleting schedule with ID:', id);

  const result = await ScheduleService.deleteSchedule(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Schedule deleted successfully',
    data: result,
  });
});

export const ScheduleController = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};
