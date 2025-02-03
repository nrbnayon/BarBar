import { Schema, model } from 'mongoose';
import { ITransaction } from './transaction.interface';

const transactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    amount: {
      type: Number,
      required: true,
    },
    userCard: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
    },
    hostCard: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
    },
    transactionType: {
      type: String,
      enum: ['appointment', 'product'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Transaction = model<ITransaction>(
  'Transaction',
  transactionSchema
);
