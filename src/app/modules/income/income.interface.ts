// src\app\modules\income\income.interface.ts
import { Model, Types } from 'mongoose';
import { PaymentMethod } from '../appointment/appointment.interface';

export type IncomeType = 'service' | 'product';
export type IncomeStatus = 'pending' | 'paid' | 'cancelled';
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IIncome {
  salon: Types.ObjectId;
  host: Types.ObjectId;
  order?: Types.ObjectId;
  confirmBy?: {
    _id: Types.ObjectId;
    name: string;
    email: string;
  };
  appointment?: Types.ObjectId;
  type: IncomeType;
  amount: number;
  status: IncomeStatus;
  paymentMethod: string | PaymentMethod;
  transactionDate: Date;
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IIncomeReport {
  totalAmount: number;
  serviceIncome: number;
  productIncome: number;
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
  transactions: IIncome[];
}

export interface IDetailedIncomeReport {
  summary: {
    totalAmount: number;
    serviceIncome: number;
    productIncome: number;
    totalTransactions: number;
  };
  byPaymentMethod: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
  dailyBreakdown: Array<{
    _id: {
      date: string;
      type: string;
    };
    total: number;
    count: number;
  }>;
  recentTransactions: IIncome[];
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
}

export interface IncomeModel extends Model<IIncome> {
  generateReport(
    hostId: string,
    period: TimePeriod,
    startDate?: Date,
    endDate?: Date
  ): Promise<IIncomeReport>;
}
