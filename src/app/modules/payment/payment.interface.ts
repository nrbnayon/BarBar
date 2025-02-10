// // src\app\modules\payment\payment.interface.ts
import { Types } from 'mongoose';
import { PaymentMethod } from '../appointment/appointment.interface';

export interface IProductWithQuantity {
  productId: Types.ObjectId;
  quantity?: number;
  price: number;
  salon: Types.ObjectId;
  host: Types.ObjectId;
}

export interface ISalonPayment {
  salon: Types.ObjectId;
  host: Types.ObjectId;
  amount: number;
  products: IProductWithQuantity[];
}

export interface IPayment {
  amount: number;
  user: Types.ObjectId;
  products: IProductWithQuantity[];
  paymentMethod?: PaymentMethod;
  cardId?: Types.ObjectId;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  email: string;
  salon: Types.ObjectId;
  host: Types.ObjectId;
  client_secret?: string;
  salonPayments: ISalonPayment[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentIntent {
  clientSecret: string;
  transactionId: string;
  amount: number;
}

export type PaymentFilters = {
  searchTerm?: string;
  status?: string;
  paymentMethod?: PaymentMethod;
  salon?: string;
  host?: string;
  startDate?: Date;
  endDate?: Date;
};



// import { Types } from 'mongoose';
// import { PaymentMethod } from '../appointment/appointment.interface';

// export interface IProductWithQuantity {
//   productId: Types.ObjectId;
//   quantity?: number;
//   price: number;
//   salon: Types.ObjectId;
//   host: Types.ObjectId;
// }

// export interface ISalonPayment {
//   salon: Types.ObjectId;
//   host: Types.ObjectId;
//   amount: number;
//   products: IProductWithQuantity[];
// }

// export interface IPayment {
//   amount: number;
//   user: Types.ObjectId;
//   products: IProductWithQuantity[];
//   paymentMethod: PaymentMethod;
//   cardId?: Types.ObjectId;
//   transactionId?: string;
//   status: 'pending' | 'completed' | 'failed' | 'cancelled';
//   email: string;
//   salon: Types.ObjectId;
//   host: Types.ObjectId;
//   client_secret?: string;
//   createdAt?: Date;
//   updatedAt?: Date;
// }

// export interface IPaymentIntent {
//   clientSecret: string;
//   transactionId: string;
//   amount: number;
// }

// export type PaymentFilters = {
//   searchTerm?: string;
//   status?: string;
//   paymentMethod?: PaymentMethod;
//   salon?: string;
//   host?: string;
//   startDate?: Date;
//   endDate?: Date;
// };