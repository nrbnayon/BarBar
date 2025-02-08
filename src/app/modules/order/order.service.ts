import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IOrder, ISalonOrder } from './order.interface';
import { Order } from './order.model';
import { Payment } from '../payment/payment.model';
import { sendNotifications } from '../../../helpers/notificationHelper';

const createOrder = async (
  userId: string,
  items: any[],
  paymentMethod: string
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Calculate total amount and organize items by salon
    const salonItemsMap = new Map<string, any[]>();
    let totalAmount = 0;

    items.forEach(item => {
      const salonId = item.salon.toString();
      if (!salonItemsMap.has(salonId)) {
        salonItemsMap.set(salonId, []);
      }
      salonItemsMap.get(salonId)!.push(item);
      totalAmount += item.price * (item.quantity || 1);
    });

    // Create salon orders
    const salonOrders: ISalonOrder[] = [];
    for (const [salonId, salonItems] of salonItemsMap) {
      const salonAmount = salonItems.reduce(
        (sum, item) => sum + item.price * (item.quantity || 1),
        0
      );
      salonOrders.push({
        salon: new mongoose.Types.ObjectId(salonId),
        host: salonItems[0].host,
        amount: salonAmount,
        items: salonItems,
        status: 'pending',
      });
    }

    // Generate order ID
    const orderId = await Order.generateOrderId();

    // Create order
    const order = await Order.create(
      [
        {
          orderId,
          user: userId,
          items,
          totalAmount,
          paymentMethod,
          salonOrders,
          status: 'pending',
        },
      ],
      { session }
    );

    // Send notifications to salon hosts
    for (const salonOrder of salonOrders) {
      await sendNotifications({
        userId: salonOrder.host.toString(),
        message: `New order received: #${orderId} - Amount: $${salonOrder.amount}`,
        type: 'ORDER',
      });
    }

    await session.commitTransaction();
    return order[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getOrderById = async (orderId: string): Promise<IOrder | null> => {
  return Order.findOne({ orderId })
    .populate('user', 'name email')
    .populate('items.product')
    .populate('items.service')
    .populate('items.salon')
    .populate('items.host')
    .populate('paymentId');
};

const getUserOrders = async (userId: string): Promise<IOrder[]> => {
  return Order.find({ user: userId })
    .populate('items.product')
    .populate('items.service')
    .populate('items.salon')
    .sort({ createdAt: -1 });
};

const getHostOrders = async (hostId: string): Promise<IOrder[]> => {
  return Order.find({ 'salonOrders.host': hostId })
    .populate('user', 'name email')
    .populate('items.product')
    .populate('items.service')
    .populate('salonOrders.salon')
    .sort({ createdAt: -1 });
};

const updateOrderStatus = async (
  orderId: string,
  status: string,
  salonId?: string
): Promise<IOrder> => {
  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }

  if (salonId) {
    // Update specific salon order status
    const salonOrder = order.salonOrders.find(
      so => so.salon.toString() === salonId
    );
    if (!salonOrder) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon order not found');
    }
    salonOrder.status = status as any;

    // Check if all salon orders are completed
    const allCompleted = order.salonOrders.every(so => so.status === status);
    if (allCompleted) {
      order.status = status as any;
    }
  } else {
    // Update main order status
    order.status = status as any;
    order.salonOrders.forEach(so => (so.status = status as any));
  }

  await order.save();
  return order;
};

export const OrderService = {
  createOrder,
  getOrderById,
  getUserOrders,
  getHostOrders,
  updateOrderStatus,
};