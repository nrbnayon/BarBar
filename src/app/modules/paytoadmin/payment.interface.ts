// src/app/modules/paytoadmin/payment.interface.ts
import { Types } from 'mongoose';

export enum PaymentMethod {
  CARD = 'card',
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  PAYPAL = 'paypal',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentType {
  APPOINTMENT = 'appointment',
  ORDER = 'order',
}

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
}

export interface IPaymentIntent {
  userId: string;
  userEmail: string;
  userName: string;
  type: PaymentType;
  itemId: string;
  paymentMethod: PaymentMethod;
}

export interface IPayment {
  _id?: Types.ObjectId;
  user: Types.ObjectId | IUser;
  host: Types.ObjectId | IUser;
  order?: Types.ObjectId;
  appointment?: Types.ObjectId;
  amount: number;
  stripePaymentIntentId: string;
  stripeCustomerId?: string;
  type?: PaymentType;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate?: Date;
  metadata?: Map<string, any>;
  adminCommission?: number;
  hostAmount?: number;
  transferredToHost: boolean;
  transferDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStripeWebhookEvent {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: {
    object: Record<string, any>;
  };
  type: string;
}

export interface IPaymentResponse {
  success: boolean;
  message: string;
  data: {
    clientSecret: string;
    paymentId: Types.ObjectId;
    customerId: string;
  };
}

