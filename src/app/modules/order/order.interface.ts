// src\app\modules\order\order.interface.ts
import { Model, Types } from 'mongoose';
import { PaymentMethod } from '../appointment/appointment.interface';

export type OrderStatus =
  | 'pending'
  | 'active'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'delivered'
  | 'completed';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'paid';

export interface IOrderItem {
  product?: Types.ObjectId;
  service?: Types.ObjectId;
  quantity?: number;
  price: number;
  salon: Types.ObjectId;
  host: Types.ObjectId;
}

export interface ISalonOrder {
  salon: Types.ObjectId;
  host: Types.ObjectId;
  amount: number;
  items: IOrderItem[];
  status: OrderStatus;
  paymentConfirmed: boolean;
}

export interface IOrder {
  orderId: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  salonOrders: ISalonOrder[];
  estimatedDeliveryStart: Date;
  estimatedDeliveryEnd: Date;
  paymentConfirmedBy?: {
    role: 'HOST' | 'USER';
    userId: Types.ObjectId;
    confirmedAt: Date;
  };
  paymentId?: Types.ObjectId;
  salon?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderModel extends Model<IOrder> {
  generateOrderId(): Promise<string>;
}