// src/app/modules/appointment/appointment.interface.ts

import { Model, Types } from 'mongoose';
import { ISalon } from '../salons/salon.interface';
import { IPayment } from '../payment/payment.interface';

export type PaymentMethod = 'cash' | 'card' | 'visa' | 'mastercard' | 'paypal';

export type PaymentInfo = {
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'refunded' | 'failed' | 'canceled';
  transactionId?: string;
  cardLastFour?: string;
  cardHolderName?: string;
  paymentDate?: Date;
  amount: number;
  currency: string;
};

export type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingSlots: number;
};

export type IAppointment = {
  appointmentId: string;
  user: Types.ObjectId | { _id: Types.ObjectId; name: string; email: string };
  service: Types.ObjectId | any;
  salon: Types.ObjectId | ISalon;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'no-show'
    | 'refunded';
  payment: PaymentInfo | IPayment;
  notes?: string;
  remarks?: string;
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

export interface AppointmentModel extends Model<IAppointment> {
  generateAppointmentId(): Promise<string>;
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
}

export interface IConfirmPaymentPayload {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  payment: {
    method: 'cash' | 'card' | 'online';
    status: 'pending' | 'paid' | 'refunded' | 'failed' | 'canceled';
  };
}