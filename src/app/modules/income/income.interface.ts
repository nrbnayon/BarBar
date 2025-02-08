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
  bankAccount?: Types.ObjectId;
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

export interface IncomeModel extends Model<IIncome> {
  generateReport(
    hostId: string,
    period: TimePeriod,
    startDate?: Date,
    endDate?: Date
  ): Promise<IIncomeReport>;
}