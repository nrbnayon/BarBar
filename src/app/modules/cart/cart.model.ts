// src\app\modules\cart\cart.model.ts
import { Schema, model } from 'mongoose';
import { ICart, ICartItem } from './cart.interface';

const cartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
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
  estimatedDeliveryStart: {
    type: Date,
    required: true,
  },
  estimatedDeliveryEnd: {
    type: Date,
    required: true,
  },
});

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 10,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'pending'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Cart = model<ICart>('Cart', cartSchema);
