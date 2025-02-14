// src\app\modules\payment\payment.model.ts
import { Schema, model } from 'mongoose';
import { IPayment } from './payment.interface';

const productWithQuantitySchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
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
});

const salonPaymentSchema = new Schema({
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
  amount: {
    type: Number,
    required: true,
  },
  products: [productWithQuantitySchema],
});

const paymentSchema = new Schema<IPayment>(
  {
    amount: {
      type: Number,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [productWithQuantitySchema],
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'visa', 'mastercard', 'paypal'],
      required: true,
    },
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: String,
    client_secret: String,
    salonPayments: [salonPaymentSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Payment = model<IPayment>('Payment', paymentSchema);

