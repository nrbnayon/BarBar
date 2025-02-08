// // src\app\modules\order\order.model.ts
// import { Schema, model } from 'mongoose';
// import { IOrder, OrderModel } from './order.interface';

// const orderItemSchema = new Schema({
//   product: {
//     type: Schema.Types.ObjectId,
//     ref: 'Product',
//   },
//   service: {
//     type: Schema.Types.ObjectId,
//     ref: 'Service',
//   },
//   quantity: Number,
//   price: {
//     type: Number,
//     required: true,
//   },
//   salon: {
//     type: Schema.Types.ObjectId,
//     ref: 'Salon',
//     required: true,
//   },
//   host: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
// });

// const salonOrderSchema = new Schema({
//   salon: {
//     type: Schema.Types.ObjectId,
//     ref: 'Salon',
//     required: true,
//   },
//   host: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   amount: {
//     type: Number,
//     required: true,
//   },
//   items: [orderItemSchema],
//   status: {
//     type: String,
//     enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'],
//     default: 'pending',
//   },
// });

// const orderSchema = new Schema<IOrder, OrderModel>(
//   {
//     orderId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     items: [orderItemSchema],
//     totalAmount: {
//       type: Number,
//       required: true,
//     },
//     paymentMethod: {
//       type: String,
//       enum: ['cash', 'visa', 'mastercard', 'paypal'],
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'],
//       default: 'pending',
//     },
//     salonOrders: [salonOrderSchema],
//     paymentId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Payment',
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: {
//       virtuals: true,
//     },
//   }
// );

// orderSchema.statics.generateOrderId = async function (): Promise<string> {
//   while (true) {
//     const orderId = Math.floor(100000 + Math.random() * 900000).toString();
//     const existingOrder = await this.findOne({ orderId });
//     if (!existingOrder) {
//       return orderId;
//     }
//   }
// };

// export const Order = model<IOrder, OrderModel>('Order', orderSchema);
import { Schema, model } from 'mongoose';
import { IOrder, OrderModel } from './order.interface';

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
    const orderId = Math.floor(100000 + Math.random() * 900000).toString();
    const existingOrder = await this.findOne({ orderId });
    if (!existingOrder) {
      return orderId;
    }
  }
};

export const Order = model<IOrder, OrderModel>('Order', orderSchema);
