// src/app/modules/appointment/appointment.model.ts
import { Schema, model } from 'mongoose';
import { IAppointment, AppointmentModel } from './appointment.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Service } from '../services/services.model';
import { Salon } from '../salons/salon.model';

const paymentInfoSchema = new Schema({
  method: {
    type: String,
    enum: ['cash', 'visa', 'mastercard', 'paypal'],
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending',
  },
  transactionId: String,
  cardLastFour: String,
  cardHolderName: String,
  paymentDate: Date,
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
});

const appointmentSchema = new Schema<IAppointment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
      default: 'pending',
    },
    payment: {
      type: paymentInfoSchema,
      required: true,
    },
    notes: String,
    cancellationReason: String,
    reminderSent: {
      type: Boolean,
      default: false,
    },
    rescheduleCount: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    lastStatusUpdate: Date,
    cancellationDeadline: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

appointmentSchema.statics.isTimeSlotAvailable = async function (
  salonId: string,
  serviceId: string,
  date: Date,
  startTime: string
): Promise<boolean> {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingAppointments = await this.countDocuments({
    salon: salonId,
    service: serviceId,
    appointmentDate: { $gte: startOfDay, $lt: endOfDay },
    startTime: startTime,
    status: { $in: ['pending', 'confirmed'] },
  });

  return existingAppointments < service.maxAppointmentsPerSlot;
};

appointmentSchema.statics.getAvailableSlots = async function (
  salonId: string,
  serviceId: string,
  date: Date
): Promise<string[]> {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
  }

  const dayOfWeek = date.toLocaleString('en-us', { weekday: 'long' });
  const businessHours = salon.businessHours.find(
    (hours: any) => hours.day === dayOfWeek && !hours.isOff
  );

  if (!businessHours) {
    return [];
  }

  const slots: string[] = [];
  const [startHour, startMinute] = businessHours.startTime.split(':');
  const [endHour, endMinute] = businessHours.endTime.split(':');

  const startDateTime = new Date(date);
  startDateTime.setHours(
    parseInt(startHour, 10),
    parseInt(startMinute, 10),
    0,
    0
  );

  const endDateTime = new Date(date);
  endDateTime.setHours(parseInt(endHour, 10), parseInt(endMinute, 10), 0, 0);

  for (
    let time = startDateTime.getTime();
    time < endDateTime.getTime();
    time += service.duration * 60000
  ) {
    const slotDateTime = new Date(time);
    const timeString = `${slotDateTime
      .getHours()
      .toString()
      .padStart(2, '0')}:${slotDateTime
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    const isAvailable = await this.isTimeSlotAvailable(
      salonId,
      serviceId,
      date,
      timeString
    );
    if (isAvailable) {
      slots.push(timeString);
    }
  }

  return slots;
};

appointmentSchema.statics.updateServiceSlotCount = async function (
  serviceId: string,
  date: Date,
  startTime: string,
  increment: boolean
) {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingAppointments = await this.countDocuments({
    service: serviceId,
    appointmentDate: { $gte: startOfDay, $lt: endOfDay },
    startTime: startTime,
    status: { $in: ['pending', 'confirmed'] },
  });

  if (increment && existingAppointments >= service.maxAppointmentsPerSlot) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Maximum appointments reached for this time slot'
    );
  }
  if (!increment && existingAppointments === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No appointments found for this time slot'
    );
  }
};

appointmentSchema.statics.isWithinCancellationWindow = function (
  appointmentDate: Date
): boolean {
  const now = new Date();
  const cancellationDeadline = new Date(
    appointmentDate.getTime() - 24 * 60 * 60 * 1000
  );
  return now < cancellationDeadline;
};

appointmentSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('appointmentDate')) {
    const apptDateTime = new Date(this.appointmentDate);
    this.cancellationDeadline = new Date(
      apptDateTime.getTime() - 24 * 60 * 60 * 1000
    );
  }

  if (
    this.isNew ||
    this.isModified('startTime') ||
    this.isModified('appointmentDate')
  ) {
    const salon = await this.model('Salon').findById(this.salon);
    if (!salon) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
    }
    const dayOfWeek = this.appointmentDate.toLocaleString('en-us', {
      weekday: 'long',
    });
    const businessHours = salon.businessHours.find(
      (hours: any) => hours.day === dayOfWeek && !hours.isOff
    );
    if (!businessHours) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Salon is closed on this day'
      );
    }

    const [openHour, openMinute] = businessHours.startTime.split(':');
    const [closeHour, closeMinute] = businessHours.endTime.split(':');
    const [appointmentHour, appointmentMinute] = this.startTime.split(':');

    const appointmentDateTime = new Date(this.appointmentDate);
    appointmentDateTime.setHours(
      parseInt(appointmentHour, 10),
      parseInt(appointmentMinute, 10),
      0,
      0
    );

    const openTime = new Date(this.appointmentDate);
    openTime.setHours(parseInt(openHour, 10), parseInt(openMinute, 10), 0, 0);

    const closeTime = new Date(this.appointmentDate);
    closeTime.setHours(
      parseInt(closeHour, 10),
      parseInt(closeMinute, 10),
      0,
      0
    );

    if (appointmentDateTime < openTime || appointmentDateTime >= closeTime) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Appointment time is outside business hours'
      );
    }
  }

  if (this.isModified('status')) {
    this.lastStatusUpdate = new Date();
  }

  if (this.isModified('payment.status')) {
    if (this.payment.status === 'paid') {
      this.status = 'confirmed';
      this.payment.paymentDate = new Date();
    } else if (this.payment.status === 'refunded') {
      this.status = 'cancelled';
    }
  }

  next();
});

export const Appointment = model<IAppointment, AppointmentModel>(
  'Appointment',
  appointmentSchema
);
