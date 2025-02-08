import { Model, Types } from 'mongoose';
import { PaymentMethod } from '../appointment/appointment.interface';

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';

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
}

export interface IOrder {
  orderId: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  salonOrders: ISalonOrder[];
  paymentId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderModel extends Model<IOrder> {
  generateOrderId(): Promise<string>;
}