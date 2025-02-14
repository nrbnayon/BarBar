// src/app/modules/paytoadmin/payment.model.ts
import { Schema, model, Model } from 'mongoose';
import {
  IPayment,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
} from './payment.interface';

interface IPaymentModel extends Model<IPayment> {
  calculateCommission(amount: number): {
    adminCommission: number;
    hostAmount: number;
  };
}

const paymentSchema = new Schema<IPayment, IPaymentModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.5, // Minimum amount in dollars
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      index: true,
    },
    paymentType: {
      type: String,
      enum: Object.values(PaymentType),
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentDate: Date,
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    adminCommission: Number,
    hostAmount: Number,
    transferredToHost: {
      type: Boolean,
      default: false,
    },
    transferDate: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes for common queries
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1, paymentType: 1 });

paymentSchema.statics.calculateCommission = function (amount: number) {
  const adminCommissionRate = 0.1;
  const adminCommission = Number((amount * adminCommissionRate).toFixed(2));
  const hostAmount = Number((amount - adminCommission).toFixed(2));
  return { adminCommission, hostAmount };
};

export const Payment = model<IPayment, IPaymentModel>('Payment', paymentSchema);