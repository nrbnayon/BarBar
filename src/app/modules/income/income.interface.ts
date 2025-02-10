// src\app\modules\income\income.interface.ts
import { Model, Types } from 'mongoose';

export type IncomeType = 'service' | 'product';
export type IncomeStatus = 'pending' | 'paid' | 'cancelled';
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IIncome {
  salon: Types.ObjectId;
  host: Types.ObjectId;
  order: Types.ObjectId;
  type: IncomeType;
  amount: number;
  status: IncomeStatus;
  paymentMethod: string;
  transactionDate: Date;
  // bankAccount?: Types.ObjectId;
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