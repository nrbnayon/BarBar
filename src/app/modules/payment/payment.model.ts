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
      enum: ['cash', 'visa', 'mastercard', 'paypal'],
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

// // src\app\modules\payment\payment.model.ts
// import { model, Schema } from 'mongoose';
// import { IPayment } from './payment.interface';

// const paymentSchema = new Schema<IPayment>(
//   {
//     amount: {
//       type: Number,
//       required: true,
//     },
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     products: [
//       {
//         productId: {
//           type: Schema.Types.ObjectId,
//           ref: 'Product',
//           required: true,
//         },
//         quantity: {
//           type: Number,
//           required: true,
//         },
//         price: {
//           type: Number,
//           required: true,
//         },
//         salon: {
//           type: Schema.Types.ObjectId,
//           ref: 'Salon',
//           required: true,
//         },
//         host: {
//           type: Schema.Types.ObjectId,
//           ref: 'User',
//           required: true,
//         },
//       },
//     ],
//     paymentMethod: {
//       type: String,
//       enum: ['cash', 'visa', 'mastercard', 'paypal'],
//       required: true,
//     },
//     cardId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Card',
//     },
//     transactionId: {
//       type: String,
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'completed', 'failed', 'cancelled'],
//       default: 'pending',
//     },
//     email: {
//       type: String,
//       required: true,
//     },
//     salon: {
//       type: Schema.Types.ObjectId,
//       ref: 'Salon',
//       required: true,
//     },
//     host: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: {
//       virtuals: true,
//     },
//   }
// );

// export const Payment = model<IPayment>('Payment', paymentSchema);


// import { model, Schema } from 'mongoose';
// import { IPayment } from './payment.interface';

// const paymentSchema = new Schema<IPayment>(
//   {
//     amount: {
//       type: Number,
//       required: true,
//     },
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     products: [
//       {
//         productId: {
//           type: Schema.Types.ObjectId,
//           ref: 'Product',
//           required: true,
//         },
//         quantity: {
//           type: Number,
//           required: true,
//         },
//         price: {
//           type: Number,
//           required: true,
//         },
//         salon: {
//           type: Schema.Types.ObjectId,
//           ref: 'Salon',
//           required: true,
//         },
//         host: {
//           type: Schema.Types.ObjectId,
//           ref: 'User',
//           required: true,
//         },
//       },
//     ],
//     paymentMethod: {
//       type: String,
//       enum: ['cash', 'visa', 'mastercard', 'paypal'],
//       required: true,
//     },
//     cardId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Card',
//     },
//     transactionId: {
//       type: String,
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'completed', 'failed', 'cancelled'],
//       default: 'pending',
//     },
//     email: {
//       type: String,
//       required: true,
//     },
//     salon: {
//       type: Schema.Types.ObjectId,
//       ref: 'Salon',
//       required: true,
//     },
//     host: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: {
//       virtuals: true,
//     },
//   }
// );

// export const Payment = model<IPayment>('Payment', paymentSchema);
