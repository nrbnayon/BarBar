import { Types } from 'mongoose';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TransactionType = 'appointment' | 'product';

export interface ITransaction {
  user: Types.ObjectId;
  host: Types.ObjectId;
  appointment?: Types.ObjectId;
  product?: Types.ObjectId;
  amount: number;
  userCard: Types.ObjectId;
  hostCard: Types.ObjectId;
  transactionType: TransactionType;
  status: TransactionStatus;
  paymentDate: Date;
  transactionId: string;
  description: string;
}
