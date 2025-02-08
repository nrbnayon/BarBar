import { Schema, model } from 'mongoose';
import { BankAccountModel, IBankAccount } from './bankAccount.interface';
import { encryptAccountNumber } from '../../../util/bankAccountUtils';

const bankAccountSchema = new Schema<IBankAccount>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      set: encryptAccountNumber,
      select: false,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    branchName: {
      type: String,
      required: true,
      trim: true,
    },
    routingNumber: {
      type: String,
      required: true,
    },
    swiftCode: {
      type: String,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'rejected'],
      default: 'pending',
    },
    verificationDocument: {
      type: String,
    },
    remarks: {
      type: String,
    },
    lastFourDigits: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.accountNumber;
        return ret;
      },
    },
  }
);

bankAccountSchema.index(
  {
    user: 1,
    lastFourDigits: 1,
    bankName: 1,
  },
  {
    unique: true,
    name: 'unique_user_bank_account',
  }
);

bankAccountSchema.pre('save', async function (next) {
  if (this.isDefault) {
    await this.model('BankAccount').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export const BankAccount = model<IBankAccount, BankAccountModel>('BankAccount', bankAccountSchema);