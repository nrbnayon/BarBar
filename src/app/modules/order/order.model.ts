 // src\app\modules\order\order.model.ts
import { Schema, model } from 'mongoose';
import { IOrder, OrderModel } from './order.interface';
import crypto from 'crypto';

const orderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
  },
  quantity: Number,
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

const salonOrderSchema = new Schema({
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
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'],
    default: 'pending',
  },
  paymentConfirmed: {
    type: Boolean,
    default: false,
  },
});

const orderSchema = new Schema<IOrder, OrderModel>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'visa', 'mastercard', 'paypal'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    salonOrders: [salonOrderSchema],
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    estimatedDeliveryStart: {
      type: Date,
      // required: true,
    },
    estimatedDeliveryEnd: {
      type: Date,
      // required: true,
    },
    paymentConfirmedBy: {
      role: {
        type: String,
        enum: ['host', 'user'],
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      confirmedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

orderSchema.statics.generateOrderId = async function (): Promise<string> {
  while (true) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const randomChars = crypto.randomBytes(2).toString('hex').slice(0, 3);
    const orderId = `${randomNum}${randomChars}`;
    const existingOrder = await this.findOne({ orderId });
    if (!existingOrder) {
      return orderId;
    }
  }
};

export const Order = model<IOrder, OrderModel>('Order', orderSchema);
