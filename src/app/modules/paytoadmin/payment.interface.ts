// src\app\modules\paytoadmin\payment.interface.ts
import { Model, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentType = 'appointment' | 'product';
export type PaymentMethod = 'cash' | 'visa' | 'mastercard' | 'paypal';

export interface IPayment {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  host: Types.ObjectId;
  order?: Types.ObjectId;
  appointment?: Types.ObjectId;
  amount: number;
  stripePaymentIntentId: string;
  stripeCustomerId?: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate?: Date;
  metadata?: Record<string, any>;
  adminCommission?: number;
  hostAmount?: number;
  transferredToHost?: boolean;
  transferDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentModel extends Model<IPayment> {
  calculateCommission(amount: number): {
    adminCommission: number;
    hostAmount: number;
  };
}