import { Schema, model } from 'mongoose';
import { IIncome, IncomeModel } from './income.interface';

const incomeSchema = new Schema<IIncome, IncomeModel>(
  {
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    type: {
      type: String,
      enum: ['service', 'product'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'visa', 'mastercard', 'paypal'],
      required: true,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    bankAccount: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    remarks: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

incomeSchema.statics.generateReport = async function (
  hostId: string,
  period: string,
  startDate?: Date,
  endDate?: Date
) {
  let dateFilter: any = {};

  if (startDate && endDate) {
    dateFilter = {
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };
  } else {
    const now = new Date();
    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(now.getDate() + 6));
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }
    dateFilter = {
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };
  }

  const transactions = await this.find({
    host: hostId,
    status: 'paid',
    ...dateFilter,
  }).populate('order salon');

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const serviceIncome = transactions
    .filter(t => t.type === 'service')
    .reduce((sum, t) => sum + t.amount, 0);
  const productIncome = transactions
    .filter(t => t.type === 'product')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalAmount,
    serviceIncome,
    productIncome,
    period,
    startDate,
    endDate,
    transactions,
  };
};

export const Income = model<IIncome, IncomeModel>('Income', incomeSchema);