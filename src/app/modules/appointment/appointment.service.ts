// src\app\modules\appointment\appointment.service.ts
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import {
  IAppointment,
  IConfirmPaymentPayload,
  PaymentInfo,
  PaymentMethod,
  TimeSlot,
} from './appointment.interface';
import { Appointment } from './appointment.model';
import { Salon } from '../salons/salon.model';
import mongoose from 'mongoose';
import { Service } from '../services/services.model';
import { Income } from '../income/income.model';
import { USER_ROLES } from '../../../enums/user';
import { ISalon } from '../salons/salon.interface';
import { IIncome } from '../income/income.interface';
import { IncomeService } from '../income/income.service';
import { sendNotifications } from '../../../helpers/notificationHelper';

const createAppointment = async (
  userId: string,
  payload: Partial<IAppointment>
): Promise<IAppointment> => {
  const service = await Service.findById(payload.service);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  if (typeof payload.appointmentDate !== 'string') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid appointment date');
  }
  const appointmentDate = new Date(payload.appointmentDate);
  const [hours, minutes] = (payload.startTime as string).split(':').map(Number);
  const startDateTime = new Date(appointmentDate);
  startDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  if (startDateTime <= now) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot create appointments in the past or for current time'
    );
  }

  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + service.duration);
  const endTime = `${endDateTime
    .getHours()
    .toString()
    .padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

  // Check for overlapping appointments
  const overlappingAppointments = await Appointment.find({
    salon: service.salon, // Use salon from service
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
    service.salon.toString(),
    service._id.toString(),
    appointmentDate,
    payload.startTime!
  );

  if (!isAvailable) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This time slot is fully booked'
    );
  }

  // Create appointment with data from service
  const result = await Appointment.create({
    ...payload,
    user: userId,
    salon: service.salon, // Set salon from service
    endTime,
    duration: service.duration,
    price: service.price,
    status: 'pending',
    payment: {
      ...payload.payment,
      amount: service.price, // Set amount from service price
      currency: 'USD',
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
  console.log('Get time slots: ', availableSlots, timeSlots);
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

  if (appointment.status !== 'pending') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Can only process payment for pending appointments'
    );
  }

  let paymentUpdate: any = {
    method: paymentMethod,
    status: 'pending',
  };

  if (paymentMethod === 'cash') {
    paymentUpdate.status = 'pending';
  } else {
    if (!paymentDetails.cardNumber) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Card details are required');
    }
    paymentUpdate.cardLastFour = paymentDetails.cardNumber.slice(-4);
    paymentUpdate.cardHolderName = paymentDetails.cardHolderName;
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

  // If payment is completed, create income record
  if (paymentUpdate.status === 'paid') {
    const salon = await Salon.findById(result.salon).populate('host');
    if (!salon) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
    }

    await Income.create({
      salon: result.salon,
      host: salon.host,
      order: result._id,
      type: 'service',
      amount: result.price,
      status: 'paid',
      paymentMethod,
      transactionDate: new Date(),
      remarks: 'Service payment completed',
    });
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
  console.log('Starting status update for appointment:', id);
  console.log('New status payload:', payload);

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    console.log('Appointment not found:', id);
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  console.log('Current appointment status:', appointment.status);
  console.log('New status:', payload.status);

  if (payload.status === 'cancelled') {
    console.log('Checking cancellation window...');
    const isWithinWindow = Appointment.isWithinCancellationWindow(
      appointment.appointmentDate
    );
    console.log('Is within cancellation window:', isWithinWindow);
    if (!isWithinWindow) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cancellation window has expired (24 hours before appointment)'
      );
    }
  }

  // Handle slot count based on status changes
  if (payload.status && payload.status !== appointment.status) {
    console.log(
      'Status is changing from',
      appointment.status,
      'to',
      payload.status
    );

    // Calculate current slot count
    const currentSlots = await Appointment.countDocuments({
      service: appointment.service,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      status: { $in: ['pending', 'confirmed'] },
    });
    console.log('Current slot count:', currentSlots);

    if (
      payload.status === 'completed' ||
      payload.status === 'cancelled' ||
      payload.status === 'no-show'
    ) {
      console.log('Decreasing slot count for status:', payload.status);
      try {
        await Appointment.updateServiceSlotCount(
          appointment.service.toString(),
          appointment.appointmentDate,
          appointment.startTime,
          false
        );
        console.log('Successfully decreased slot count');
      } catch (error) {
        console.error('Error decreasing slot count:', error);
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to update slot count'
        );
      }
    }

    if (
      (appointment.status === 'completed' ||
        appointment.status === 'cancelled' ||
        appointment.status === 'no-show') &&
      payload.status === 'confirmed'
    ) {
      console.log('Increasing slot count for status change to confirmed');
      try {
        await Appointment.updateServiceSlotCount(
          appointment.service.toString(),
          appointment.appointmentDate,
          appointment.startTime,
          true // increase count
        );
        console.log('Successfully increased slot count');
      } catch (error) {
        console.error('Error increasing slot count:', error);
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to update slot count'
        );
      }
    }

    if (
      payload.status === 'completed' &&
      (appointment.payment as PaymentInfo).method === 'cash' &&
      appointment.payment.status !== 'paid'
    ) {
      // Update payment status
      appointment.payment.status = 'paid';
      if ('paymentDate' in appointment.payment) {
        (appointment.payment as PaymentInfo).paymentDate = new Date();
      }

      const hostOwner = await Salon.findById(appointment.salon).populate(
        'host'
      );

      if (!hostOwner) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Host owner not found');
      }

      console.log('Get service provide owner Line 430::', hostOwner);
    }

    // Verify updated slot count
    const updatedSlots = await Appointment.countDocuments({
      service: appointment.service,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      status: { $in: ['pending', 'confirmed'] },
    });
    console.log('Updated slot count:', updatedSlots);
  }

  console.log('Updating appointment with new status...');
  const result = await Appointment.findByIdAndUpdate(
    id,
    {
      ...payload,
      lastStatusUpdate: new Date(),
      updatedAt: new Date(),
    },
    { new: true }
  ).populate(['service', 'salon', 'user']);

  if (!result) {
    console.log('Failed to update appointment');
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update appointment status'
    );
  }

  console.log('Successfully updated appointment status');
  console.log('Final appointment state:', result);

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

  const [hours, minutes] = newStartTime.split(':').map(Number);
  newAppointmentDate.setHours(hours, minutes);
  const endDate = new Date(newAppointmentDate);
  endDate.setMinutes(endDate.getMinutes() + service.duration);
  const newEndTime = `${endDate
    .getHours()
    .toString()
    .padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

  await Appointment.updateServiceSlotCount(
    appointment.service.toString(),
    appointment.appointmentDate,
    appointment.startTime,
    false
  );

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

const confirmCashPayment = async (
  appointmentId: string,
  userId: string,
  userRole: string,
  payload: IConfirmPaymentPayload
): Promise<IAppointment> => {
  const appointment = await Appointment.findById(appointmentId)
    .populate(['service', 'salon'])
    .populate('user', 'name email');

  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  const salon = appointment.salon as ISalon;
  const appointmentUser = appointment.user as { _id: mongoose.Types.ObjectId };

  if (
    (userRole === USER_ROLES.HOST && salon.host.toString() !== userId) ||
    (userRole === USER_ROLES.USER && appointmentUser._id.toString() !== userId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Only the ${
        userRole === USER_ROLES.HOST ? 'salon host' : 'appointment user'
      } can confirm this payment`
    );
  }

  if ((appointment.payment as PaymentInfo).method !== 'cash') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This endpoint is only for cash payments'
    );
  }

  if (appointment.payment.status === 'paid') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Payment has already been confirmed and completed'
    );
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          status: payload.status,
          'payment.status': payload.payment.status,
          'payment.paymentDate': new Date(),
          remarks: `Cash payment confirmed by ${
            userRole === USER_ROLES.HOST ? 'host' : 'user'
          }`,
        },
      },
      { new: true, session }
    );

    if (!updatedAppointment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update appointment');
    }

    const userInfo = appointment.user as {
      _id: mongoose.Types.ObjectId;
      name: string;
      email: string;
    };

    const incomeData: IIncome = {
      salon: salon._id!,
      host: salon.host,
      order: appointment._id,
      confirmBy: {
        _id: userInfo._id,
        name: userInfo.name,
        email: userInfo.email,
      },
      type: 'service',
      amount: appointment.price,
      status: 'paid',
      paymentMethod: 'cash',
      transactionDate: new Date(),
      remarks: `Cash payment confirmed by ${
        userRole === USER_ROLES.HOST ? 'host' : 'user'
      }`,
    };

    await IncomeService.createIncome(incomeData);

    // Send notifications based on who confirmed the payment
    if (userRole === USER_ROLES.USER) {
      // If user confirms, notify host and admin
      await sendNotifications({
        message: `Payment confirmed by user for appointment ${updatedAppointment?.appointmentId}`,
        type: 'PAYMENT',
        receiver: salon.host,
        metadata: {
          appointmentId,
          confirmedBy: userInfo.name,
          amount: appointment.price,
        },
      });

      await sendNotifications({
        message: `Payment confirmed by user for appointment ${updatedAppointment?.appointmentId}`,
        type: 'ADMIN', // Notify the admin
        metadata: {
          appointmentId,
          confirmedBy: userInfo.name,
          amount: appointment.price,
        },
      });
    } else if (userRole === USER_ROLES.HOST) {
      // If host confirms, notify user and admin
      await sendNotifications({
        message: `Payment confirmed by host for appointment ${updatedAppointment?.appointmentId}`,
        type: 'PAYMENT',
        receiver: appointmentUser._id,
        metadata: {
          appointmentId,
          confirmedBy: salon.host,
          amount: appointment.price,
        },
      });

      await sendNotifications({
        message: `Payment confirmed by host for appointment ${updatedAppointment?.appointmentId}`,
        type: 'ADMIN', 
        metadata: {
          appointmentId,
          confirmedBy: salon.host,
          amount: appointment.price,
        },
      });
    }

    await session.commitTransaction();
    return updatedAppointment;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const AppointmentService = {
  createAppointment,
  getAvailableTimeSlots,
  getAppointments,
  getSalonAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
  processPayment,
  confirmCashPayment,
};
