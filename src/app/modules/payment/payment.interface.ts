// src\app\modules\payment\payment.interface.ts
import { Types } from 'mongoose';
import { PaymentMethod } from '../appointment/appointment.interface';

export interface IProductWithQuantity {
  productId: Types.ObjectId;
  quantity?: number;
  price: number;
  salon: Types.ObjectId;
  host: Types.ObjectId;
}

export interface IPayment {
  amount: number;
  user: Types.ObjectId;
  products: IProductWithQuantity[];
  paymentMethod: PaymentMethod;
  cardId?: Types.ObjectId; 
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  email: string;
  salon: Types.ObjectId;
  host: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentIntent {
  clientSecret: string;
  transactionId: string;
  amount: number;
}

export type PaymentFilters = {
  searchTerm?: string;
  status?: string;
  paymentMethod?: PaymentMethod;
  salon?: string;
  host?: string;
  startDate?: Date;
  endDate?: Date;
};