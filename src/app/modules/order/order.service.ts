// src\app\modules\order\order.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IOrder, ISalonOrder } from './order.interface';
import { Order } from './order.model';
import { Payment } from '../payment/payment.model';
import { sendNotifications } from '../../../helpers/notificationHelper';
import { Cart } from '../cart/cart.model';
import { Product } from '../product/product.model';

// const createOrder = async (
//   userId: string,
//   items: any[],
//   paymentMethod: string
// ): Promise<IOrder> => {
//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     // Calculate total amount and organize items by salon
//     const salonItemsMap = new Map<string, any[]>();
//     let totalAmount = 0;

//     items.forEach(item => {
//       const salonId = item.salon.toString();
//       if (!salonItemsMap.has(salonId)) {
//         salonItemsMap.set(salonId, []);
//       }
//       salonItemsMap.get(salonId)!.push(item);
//       totalAmount += item.price * (item.quantity || 1);
//     });

//     // Create salon orders
//     const salonOrders: ISalonOrder[] = [];
//     for (const [salonId, salonItems] of salonItemsMap) {
//       const salonAmount = salonItems.reduce(
//         (sum, item) => sum + item.price * (item.quantity || 1),
//         0
//       );
//       salonOrders.push({
//         salon: new mongoose.Types.ObjectId(salonId),
//         host: salonItems[0].host,
//         amount: salonAmount,
//         items: salonItems,
//         status: 'pending',
//       });
//     }

//     // Generate order ID
//     const orderId = await Order.generateOrderId();

//     // Create order
//     const order = await Order.create(
//       [
//         {
//           orderId,
//           user: userId,
//           items,
//           totalAmount,
//           paymentMethod,
//           salonOrders,
//           status: 'pending',
//         },
//       ],
//       { session }
//     );

//     // Send notifications to salon hosts
//     for (const salonOrder of salonOrders) {
//       await sendNotifications({
//         userId: salonOrder.host.toString(),
//         message: `New order received: #${orderId} - Amount: $${salonOrder.amount}`,
//         type: 'ORDER',
//       });
//     }

//     await session.commitTransaction();
//     return order[0];
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

const createOrder = async (
  userId: string,
  items: any[],
  paymentMethod: string
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Validate all products first
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          `Product not found: ${item.product}`
        );
      }
      if (product.quantity < item.quantity) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Insufficient quantity for product: ${product.name}`
        );
      }
    }

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
        paymentConfirmed: paymentMethod === 'cash' ? false : true,
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
          // For cash payments, order remains pending until all hosts confirm
          paymentStatus: paymentMethod === 'cash' ? 'pending' : 'completed',
        },
      ],
      { session }
    );

    // For cash payments, send payment confirmation requests to hosts
    if (paymentMethod === 'cash') {
      for (const salonOrder of salonOrders) {
        await sendNotifications({
          userId: salonOrder.host.toString(),
          message: `New cash order #${orderId} received - Amount: $${salonOrder.amount}. Please confirm payment receipt.`,
          type: 'PAYMENT',
          data: {
            orderId,
            salonId: salonOrder.salon.toString(),
            amount: salonOrder.amount,
          },
        });
      }
    } else {
      // For card payments, send order notifications
      for (const salonOrder of salonOrders) {
        await sendNotifications({
          userId: salonOrder.host.toString(),
          message: `New order #${orderId} received - Amount: $${salonOrder.amount}`,
          type: 'ORDER',
          data: {
            orderId,
            salonId: salonOrder.salon.toString(),
            amount: salonOrder.amount,
          },
        });
      }
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
    .populate('items.salon', 'name')
    .populate('items.product', 'name images')
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

const confirmSalonPayment = async (
  orderId: string,
  salonId: string,
  hostId: string
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
    }

    const salonOrder = order.salonOrders.find(
      so => so.salon.toString() === salonId && so.host.toString() === hostId
    );

    if (!salonOrder) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon order not found');
    }

    if (salonOrder.paymentConfirmed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment already confirmed');
    }

    // Update payment confirmation for this salon
    salonOrder.paymentConfirmed = true;

    // Check if all salon payments are confirmed
    const allPaymentsConfirmed = order.salonOrders.every(
      so => so.paymentConfirmed
    );
    if (allPaymentsConfirmed) {
      order.paymentStatus = 'completed';
      order.status = 'confirmed';

      // Update product quantities
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: -(item.quantity || 1) },
        });
      }

      // Notify user that order is confirmed
      await sendNotifications({
        userId: order.user.toString(),
        message: `Order #${order.orderId} has been confirmed. All payments received.`,
        type: 'ORDER_CONFIRMATION',
      });
    }

    await order.save({ session });
    await session.commitTransaction();

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const createOrderFromCart = async (
  userId: string,
  paymentMethod: string
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Get active cart
    const cart = await Cart.findOne({ user: userId, status: 'active' })
      .populate('items.product')
      .populate('items.salon')
      .populate('items.host')
      .populate('items.salon', 'name');

    if (!cart || cart.items.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cart is empty');
    }

    // Validate all products
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          `Product not found: ${item.product}`
        );
      }
      if (product.quantity < item.quantity) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Insufficient quantity for product: ${product.name}`
        );
      }
    }

    // Group items by salon
    const salonItemsMap = new Map<string, any[]>();
    cart.items.forEach(item => {
      const salonId = item.salon._id.toString();
      if (!salonItemsMap.has(salonId)) {
        salonItemsMap.set(salonId, []);
      }
      salonItemsMap.get(salonId)!.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        salon: item.salon._id,
        host: item.host._id,
      });
    });

    // Create salon orders
    const salonOrders = Array.from(salonItemsMap.entries()).map(
      ([salonId, items]) => ({
        salon: new mongoose.Types.ObjectId(salonId),
        host: items[0].host,
        amount: items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
        items: items,
        status: 'pending',
        paymentConfirmed: paymentMethod === 'cash' ? false : true,
      })
    );

    // Generate order ID
    const orderId = await Order.generateOrderId();

    // Create order
    const order = await Order.create(
      [
        {
          orderId,
          user: userId,
          items: cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.price,
            salon: item.salon._id,
            host: item.host._id,
          })),
          totalAmount: cart.totalAmount,
          paymentMethod,
          salonOrders,
          status: 'pending',
          paymentStatus: paymentMethod === 'cash' ? 'pending' : 'completed',
        },
      ],
      { session }
    );

    // Mark cart as completed
    cart.status = 'completed';
    await cart.save({ session });

    // Send notifications based on payment method
    if (paymentMethod === 'cash') {
      for (const salonOrder of salonOrders) {
        const hostId = salonOrder.host.toString();

        // Get detailed product info for this salon's items
        const orderDetails = cart.items
          .filter(
            item => item.salon._id.toString() === salonOrder.salon.toString()
          )
          .map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.price * item.quantity,
            productImages: item.product.images,
          }));

        await sendNotifications({
          userId: salonOrder.host.toString(),
          message: `New cash order #${orderId} received - Amount: $${salonOrder.amount}. Please confirm payment receipt.`,
          type: 'ORDER',
          receiver: hostId,
          metadata: {
            orderId,
            salonId: salonOrder.salon.toString(),
            salonName: cart.items.find(
              item => item.salon._id.toString() === salonOrder.salon.toString()
            )?.salon?.name,
            amount: salonOrder.amount,
            items: orderDetails,
            customerInfo: {
              userId: userId,
              orderDate: new Date(),
              paymentMethod: paymentMethod,
            },
          },
        });
      }
    } else {
      for (const salonOrder of salonOrders) {
        const hostId = salonOrder.host.toString();

        // Get detailed product info for this salon's items
        const orderDetails = cart.items
          .filter(
            item => item.salon._id.toString() === salonOrder.salon.toString()
          )
          .map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.price * item.quantity,
            productImages: item.product.images,
          }));

        await sendNotifications({
          userId: salonOrder.host.toString(),
          message: `New order #${orderId} received - Amount: $${salonOrder.amount}`,
          type: 'ORDER',
          receiver: hostId,
          metadata: {
            orderId,
            salonId: salonOrder.salon.toString(),
            salonName: cart.items.find(
              item => item.salon._id.toString() === salonOrder.salon.toString()
            )?.salon.name,
            amount: salonOrder.amount,
            items: orderDetails,
            customerInfo: {
              userId: userId,
              orderDate: new Date(),
              paymentMethod: paymentMethod,
            },
          },
        });
      }
    }

    await session.commitTransaction();
    return order[0];

//  if (paymentMethod === 'cash') {
//    for (const salonOrder of salonOrders) {
//      const hostId = salonOrder.host.toString();

//      // Get detailed product info for this salon's items
//      const orderDetails = cart.items
//        .filter(
//          item => item.salon._id.toString() === salonOrder.salon.toString()
//        )
//        .map(item => ({
//          productName: item.product.name,
//          quantity: item.quantity,
//          price: item.price,
//          totalPrice: item.price * item.quantity,
//          productImages: item.product.images,
//        }));

//      await sendNotifications({
//        userId: salonOrder.host.toString(),
//        message: `New cash order #${orderId} received - Amount: $${salonOrder.amount}. Please confirm payment receipt.`,
//        type: 'ORDER',
//        receiver: hostId,
//        metadata: {
//          orderId,
//          salonId: salonOrder.salon.toString(),
//          salonName: cart.items.find(
//            item => item.salon._id.toString() === salonOrder.salon.toString()
//          )?.salon.name,
//          amount: salonOrder.amount,
//          items: orderDetails,
//          customerInfo: {
//            userId: userId,
//            orderDate: new Date(),
//            paymentMethod: paymentMethod,
//          },
//        },
//      });
//    }
//  } else {
//    for (const salonOrder of salonOrders) {
//      const hostId = salonOrder.host.toString();

//      // Get detailed product info for this salon's items
//      const orderDetails = cart.items
//        .filter(
//          item => item.salon._id.toString() === salonOrder.salon.toString()
//        )
//        .map(item => ({
//          productName: item.product.name,
//          quantity: item.quantity,
//          price: item.price,
//          totalPrice: item.price * item.quantity,
//          productImages: item.product.images,
//        }));

//      await sendNotifications({
//        userId: salonOrder.host.toString(),
//        message: `New order #${orderId} received - Amount: $${salonOrder.amount}`,
//        type: 'ORDER',
//        receiver: hostId,
//        metadata: {
//          orderId,
//          salonId: salonOrder.salon.toString(),
//          salonName: cart.items.find(
//            item => item.salon._id.toString() === salonOrder.salon.toString()
//          )?.salon.name,
//          amount: salonOrder.amount,
//          items: orderDetails,
//          customerInfo: {
//            userId: userId,
//            orderDate: new Date(),
//            paymentMethod: paymentMethod,
//          },
//        },
//      });
//    }
//  }

//  await session.commitTransaction();
//  return order[0];

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const OrderService = {
  createOrder,
  getOrderById,
  getUserOrders,
  getHostOrders,
  updateOrderStatus,
  createOrderFromCart,
  confirmSalonPayment,
};
