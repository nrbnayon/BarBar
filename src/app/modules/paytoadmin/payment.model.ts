// src\app\modules\paytoadmin\payment.model.ts
import { Schema, model } from 'mongoose';
import { IPayment, PaymentModel } from './payment.interface';

const paymentSchema = new Schema<IPayment, PaymentModel>(
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
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    amount: {
      type: Number,
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeCustomerId: {
      type: String,
    },
    paymentType: {
      type: String,
      enum: ['appointment', 'product'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'visa', 'mastercard', 'paypal'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentDate: {
      type: Date,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    adminCommission: {
      type: Number,
    },
    hostAmount: {
      type: Number,
    },
    transferredToHost: {
      type: Boolean,
      default: false,
    },
    transferDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Static method to calculate commission
paymentSchema.statics.calculateCommission = function (amount: number) {
  const adminCommissionRate = 0.1; // 10% commission
  const adminCommission = amount * adminCommissionRate;
  const hostAmount = amount - adminCommission;
  return { adminCommission, hostAmount };
};

export const Payment = model<IPayment, PaymentModel>('Payment', paymentSchema);
