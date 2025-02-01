// src\app\modules\appointments\appointment.service.ts
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IAppointment, PaymentMethod, TimeSlot } from './appointment.interface';
import { Appointment } from './appointment.model';
import { Salon } from '../salons/salon.model';
import mongoose from 'mongoose';
import { Service } from '../services/services.model';

const createAppointment = async (
  userId: string,
  payload: Partial<IAppointment>
): Promise<IAppointment> => {
  const service = await Service.findById(payload.service);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  // Validate selectedServices exists
  if (!payload.selectedServices || payload.selectedServices.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'At least one service must be selected'
    );
  }

  // Calculate total duration and price with null safety
  const totalDuration = payload.selectedServices.reduce(
    (sum, service) => sum + (service.duration || 0),
    0
  );

  const totalPrice = payload.selectedServices.reduce(
    (sum, service) => sum + (service.price || 0),
    0
  );

  // Convert to UTC and handle timezone
  const appointmentDate = new Date(payload.appointmentDate as string);
  const [hours, minutes] = (payload.startTime as string).split(':').map(Number);
  const startDateTime = new Date(appointmentDate);
  startDateTime.setHours(hours, minutes, 0, 0);

  // Validate appointment is not in the past
  if (startDateTime < new Date()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot create appointments in the past'
    );
  }

  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + totalDuration);
  const endTime = `${endDateTime
    .getHours()
    .toString()
    .padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

  // Check for overlapping appointments
  const overlappingAppointments = await Appointment.find({
    salon: payload.salon,
    appointmentDate: {
      $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
      $lt: new Date(appointmentDate.setHours(23, 59, 59, 999)),
    },
    $or: [
      {
        startTime: {
          $lt: endTime,
          $gte: payload.startTime,
        },
      },
      {
        endTime: {
          $gt: payload.startTime,
          $lte: endTime,
        },
      },
    ],
    status: { $in: ['pending', 'confirmed'] },
  });

  if (overlappingAppointments.length >= service.maxAppointmentsPerSlot) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This time slot is already fully booked'
    );
  }

  // Check if time slot is available
  const isAvailable = await Appointment.isTimeSlotAvailable(
    payload.salon?.toString() || '',
    payload.service?.toString() || '',
    appointmentDate,
    payload.startTime!
  );

  if (!isAvailable) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This time slot is fully booked'
    );
  }

  // Create appointment
  const result = await Appointment.create({
    ...payload,
    user: userId,
    endTime,
    totalDuration,
    totalPrice,
    status: 'pending',
    payment: {
      method: 'cash',
      status: 'pending',
    },
  });

  // Update slot count
  await Appointment.updateServiceSlotCount(
    service._id.toString(),
    appointmentDate,
    payload.startTime!,
    true
  );

  return result;
};

const getAvailableTimeSlots = async (
  salonId: string,
  serviceId: string,
  date: string
): Promise<TimeSlot[]> => {
  const appointmentDate = new Date(date);
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
  }

  const dayOfWeek = appointmentDate.toLocaleString('en-us', {
    weekday: 'long',
  });
  const businessHours = (salon.toObject() as any).businessHours?.find(
    (hours: any) => hours.day === dayOfWeek && !hours.isOff
  );

  if (!businessHours) {
    return [];
  }

  const availableSlots = await Appointment.getAvailableSlots(
    salonId,
    serviceId,
    appointmentDate
  );

  const timeSlots: TimeSlot[] = [];
  for (const startTime of availableSlots) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date(appointmentDate);
    endDate.setHours(hours, minutes);
    endDate.setMinutes(endDate.getMinutes() + service.duration);

    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    const existingAppointments = await Appointment.countDocuments({
      salon: new mongoose.Types.ObjectId(salonId),
      service: new mongoose.Types.ObjectId(serviceId),
      appointmentDate: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
        $lt: new Date(appointmentDate.setHours(23, 59, 59, 999)),
      },
      startTime,
      status: { $in: ['pending', 'confirmed'] },
    });

    timeSlots.push({
      startTime,
      endTime,
      available: existingAppointments < service.maxAppointmentsPerSlot,
      remainingSlots: service.maxAppointmentsPerSlot - existingAppointments,
    });
  }

  return timeSlots;
};

const processPayment = async (
  appointmentId: string,
  paymentMethod: PaymentMethod,
  paymentDetails: any
): Promise<IAppointment> => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  // Process payment based on method
  let paymentUpdate: any = {
    method: paymentMethod,
    status: 'pending',
  };

  if (paymentMethod === 'cash') {
    paymentUpdate.status = 'pending';
  } else {
    // For card payments, store last 4 digits and process payment
    if (paymentDetails.cardNumber) {
      paymentUpdate.cardLastFour = paymentDetails.cardNumber.slice(-4);
      paymentUpdate.cardHolderName = paymentDetails.cardHolderName;
    }
    paymentUpdate.status = 'paid';
    paymentUpdate.transactionId = `TXN${Date.now()}`;
    paymentUpdate.paymentDate = new Date();
  }

  const result = await Appointment.findByIdAndUpdate(
    appointmentId,
    {
      payment: paymentUpdate,
      status: paymentUpdate.status === 'paid' ? 'confirmed' : 'pending',
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to process payment'
    );
  }

  return result;
};

const getAppointments = async (
  userId: string,
  filters: Record<string, unknown>
) => {
  const conditions: any[] = [{ user: new mongoose.Types.ObjectId(userId) }];
  const { status, date, upcoming } = filters;

  if (status) {
    conditions.push({ status });
  }

  if (date) {
    conditions.push({
      appointmentDate: {
        $gte: new Date(date as string),
        $lt: new Date(
          new Date(date as string).setDate(
            new Date(date as string).getDate() + 1
          )
        ),
      },
    });
  }

  if (upcoming === 'true') {
    conditions.push({
      appointmentDate: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] },
    });
  }

  const result = await Appointment.find({ $and: conditions })
    .populate(['service', 'salon'])
    .sort({ appointmentDate: 1, startTime: 1 });

  return result;
};

const getSalonAppointments = async (
  salonId: string,
  filters: Record<string, unknown>
) => {
  const conditions: any[] = [{ salon: new mongoose.Types.ObjectId(salonId) }];
  const { status, date, serviceId } = filters;

  if (status) {
    conditions.push({ status });
  }

  if (date) {
    conditions.push({
      appointmentDate: {
        $gte: new Date(date as string),
        $lt: new Date(
          new Date(date as string).setDate(
            new Date(date as string).getDate() + 1
          )
        ),
      },
    });
  }

  if (serviceId) {
    conditions.push({
      service: new mongoose.Types.ObjectId(serviceId as string),
    });
  }

  const result = await Appointment.find({ $and: conditions })
    .populate(['user', 'service'])
    .sort({ appointmentDate: 1, startTime: 1 });

  return result;
};

const updateAppointmentStatus = async (
  id: string,
  payload: Partial<IAppointment>
): Promise<IAppointment | null> => {
  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (payload.status === 'cancelled') {
    const isWithinWindow = Appointment.isWithinCancellationWindow(
      appointment.appointmentDate
    );
    if (!isWithinWindow) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cancellation window has expired (24 hours before appointment)'
      );
    }
  }

  // Handle slot count updates based on status changes
  if (payload.status && payload.status !== appointment.status) {
    if (payload.status === 'cancelled' || payload.status === 'no-show') {
      await Appointment.updateServiceSlotCount(
        appointment.service.toString(),
        appointment.appointmentDate,
        appointment.startTime,
        false
      );
    } else if (
      (appointment.status === 'cancelled' ||
        appointment.status === 'no-show') &&
      payload.status === 'confirmed'
    ) {
      await Appointment.updateServiceSlotCount(
        appointment.service.toString(),
        appointment.appointmentDate,
        appointment.startTime,
        true
      );
    }
  }

  const result = await Appointment.findByIdAndUpdate(
    id,
    { ...payload, updatedAt: new Date() },
    { new: true }
  );

  return result;
};

const rescheduleAppointment = async (
  id: string,
  newDate: string,
  newStartTime: string
): Promise<IAppointment | null> => {
  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.rescheduleCount >= 2) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Maximum reschedule limit reached'
    );
  }

  const service = await Service.findById(appointment.service);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const newAppointmentDate = new Date(newDate);
  const isAvailable = await Appointment.isTimeSlotAvailable(
    appointment.salon.toString(),
    appointment.service.toString(),
    newAppointmentDate,
    newStartTime
  );

  if (!isAvailable) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'New time slot is not available'
    );
  }

  // Calculate new end time
  const [hours, minutes] = newStartTime.split(':').map(Number);
  newAppointmentDate.setHours(hours, minutes);
  const endDate = new Date(newAppointmentDate);
  endDate.setMinutes(endDate.getMinutes() + service.duration);
  const newEndTime = `${endDate
    .getHours()
    .toString()
    .padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

  // Release old slot
  await Appointment.updateServiceSlotCount(
    appointment.service.toString(),
    appointment.appointmentDate,
    appointment.startTime,
    false
  );

  // Reserve new slot
  await Appointment.updateServiceSlotCount(
    appointment.service.toString(),
    newAppointmentDate,
    newStartTime,
    true
  );

  const result = await Appointment.findByIdAndUpdate(
    id,
    {
      appointmentDate: newAppointmentDate,
      startTime: newStartTime,
      endTime: newEndTime,
      rescheduleCount: appointment.rescheduleCount + 1,
      updatedAt: new Date(),
    },
    { new: true }
  );

  return result;
};

export const AppointmentService = {
  createAppointment,
  getAvailableTimeSlots,
  getAppointments,
  getSalonAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
  processPayment,
};
