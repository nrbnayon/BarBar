// src\app\modules\appointment\appointment.interface.ts
import { Model, Types } from 'mongoose';

export type PaymentMethod = 'cash' | 'visa' | 'mastercard' | 'paypal';

export type PaymentInfo = {
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  transactionId?: string;
  cardLastFour?: string;
  cardHolderName?: string;
  paymentDate?: Date;
  amount: number;
  currency: string;
};

export type IAppointment = {
  user: Types.ObjectId;
  service: Types.ObjectId;
  salon: Types.ObjectId;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  payment: PaymentInfo;
  notes?: string;
  cancellationReason?: string;
  reminderSent: boolean;
  rescheduleCount: number;
  duration: number;
  price: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastStatusUpdate?: Date;
  cancellationDeadline?: Date;
};

export type AppointmentModel = {
  isTimeSlotAvailable(
    salonId: string,
    serviceId: string,
    date: Date,
    startTime: string
  ): Promise<boolean>;
  getAvailableSlots(
    salonId: string,
    serviceId: string,
    date: Date
  ): Promise<string[]>;
  updateServiceSlotCount(
    serviceId: string,
    date: Date,
    startTime: string,
    increment: boolean
  ): Promise<void>;
  isWithinCancellationWindow(appointmentDate: Date): boolean;
} & Model<IAppointment>;

export type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingSlots: number;
};