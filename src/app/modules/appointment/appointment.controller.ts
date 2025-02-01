// src\app\modules\appointment\appointment.controller.ts
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AppointmentService } from './appointment.service';

const createAppointment = catchAsync(async (req: Request, res: Response) => {
  console.log('Controller - Request body:', req.body);
  
  const appointmentData = {
    service: req.body.service,
    appointmentDate: req.body.appointmentDate,
    startTime: req.body.startTime,
    payment: req.body.payment,
    notes: req.body.notes
  };

  console.log('Controller - Appointment data:', appointmentData);
  
  const result = await AppointmentService.createAppointment(
    req.user.id,
    appointmentData
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Appointment created successfully',
    data: result,
  });
});

const getAvailableTimeSlots = catchAsync(
  async (req: Request, res: Response) => {
    const { salonId, serviceId, date } = req.params;
    const result = await AppointmentService.getAvailableTimeSlots(
      salonId,
      serviceId,
      date
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Available time slots retrieved successfully',
      data: result,
    });
  }
);

const getAppointments = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.getAppointments(
    req.user.id,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Appointments retrieved successfully',
    data: result,
  });
});

const getSalonAppointments = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.getSalonAppointments(
    req.params.salonId,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      'Salon appointments retrieved successfully',
    data: result,
  });
});

const updateAppointmentStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      req.body
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Appointment status updated successfully',
      data: result,
    });
  }
);

const rescheduleAppointment = catchAsync(
  async (req: Request, res: Response) => {
    const { appointmentDate, startTime } = req.body;
    const result = await AppointmentService.rescheduleAppointment(
      req.params.id,
      appointmentDate,
      startTime
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Appointment rescheduled successfully',
      data: result,
    });
  }
);

const processPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.processPayment(
    req.params.id,
    req.body.method,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment processed successfully',
    data: result,
  });
});

export const AppointmentController = {
  createAppointment,
  getAvailableTimeSlots,
  getAppointments,
  getSalonAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
  processPayment,
};
