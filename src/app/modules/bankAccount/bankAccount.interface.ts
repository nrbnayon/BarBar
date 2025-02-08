import { Model, Types } from 'mongoose';

export type BankAccountStatus = 'active' | 'inactive' | 'pending' | 'rejected';

export interface IBankAccount {
  user: Types.ObjectId;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  routingNumber: string;
  swiftCode?: string;
  isDefault: boolean;
  status: BankAccountStatus;
  verificationDocument?: string;
  remarks?: string;
  lastFourDigits: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BankAccountModel = Model<IBankAccount>;