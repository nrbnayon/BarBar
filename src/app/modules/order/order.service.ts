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
import { IncomeService } from '../income/income.service';
import { IIncome, IncomeStatus, IncomeType } from '../income/income.interface';
import { IConfirmPaymentPayload } from '../appointment/appointment.interface';
import { USER_ROLES } from '../../../enums/user';

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
    .populate({
      path: 'items.salon',
      select: '-remarks -businessHours -doc -passportNum -__v',
    })
    .sort({ createdAt: -1 });
};

const getHostOrders = async (hostId: string): Promise<IOrder[]> => {
  return Order.find({ 'salonOrders.host': hostId })
    .populate('user', 'name email')
    .populate('items.product')
    .populate('items.service')
    .populate({
      path: 'salonOrders.salon',
      select: '-remarks -businessHours -doc -passportNum -__v',
    })
    .sort({ createdAt: -1 });
};

const updateOrderStatus = async (
  orderId: string,
  status: string,
  hostSalonId: string
): Promise<IOrder> => {
  const order = await Order.findOne({ orderId });

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }

  if (order.salonOrders.length === 0) {
    const hasValidItems = order.items.some(
      item => item.salon.toString() === hostSalonId
    );

    if (!hasValidItems) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'No orders found for your salon'
      );
    }

    order.status = status as any;
    await order.save();
    return order;
  }

  const salonOrder = order.salonOrders.find(
    so => so.salon.toString() === hostSalonId
  );

  if (!salonOrder) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No orders found for your salon');
  }

  salonOrder.status = status as any;

  const allCompleted = order.salonOrders.every(so => so.status === status);
  if (allCompleted) {
    order.status = status as any;
  }

  await order.save();
  return order;
};

// single salon cart items
const createOrderFromSingleCart = async (
  userId: string,
  paymentMethod: string
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Fetch the cart and exclude unnecessary fields from the salon
    const cart = await Cart.findOne({ user: userId, status: 'active' })
      .populate({
        path: 'items.product',
        select: '-__v',
      })
      .populate({
        path: 'items.salon',
        select: '-remarks -businessHours -doc -passportNum -__v',
      })
      .populate({
        path: 'items.host',
        select: '-__v',
      });

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

    // Calculate delivery dates (5-7 days from now)
    const now = new Date();
    const estimatedDeliveryStart = new Date(now.setDate(now.getDate() + 5));
    const estimatedDeliveryEnd = new Date(now.setDate(now.getDate() + 2));

    // Generate order ID
    const orderId = await Order.generateOrderId();

    // Create order
    const order = await Order.create(
      [
        {
          orderId,
          user: userId,
          salon: cart.salon,
          items: cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.price,
            salon: item.salon,
            host: item.host._id,
          })),
          subtotal: cart.totalAmount,
          deliveryFee: cart.deliveryFee,
          totalAmount: cart.totalAmount + cart.deliveryFee,
          paymentMethod,
          status: 'pending',
          paymentStatus: paymentMethod === 'cash' ? 'pending' : 'completed',
          estimatedDeliveryStart,
          estimatedDeliveryEnd,
        },
      ],
      { session }
    );

    // Mark cart as pending instead of completed
    cart.status = 'pending';
    await cart.save({ session });

    // Send notifications
    const notificationMessage =
      paymentMethod === 'cash'
        ? `New cash order ${orderId} received. Total amount: $${order[0].totalAmount}`
        : `New order ${orderId} received. Total amount: $${order[0].totalAmount}`;

    await sendNotifications({
      receiver: cart.items[0].host._id.toString(),
      message: notificationMessage,
      type: 'ORDER',
      metadata: {
        orderId,
        amount: order[0].totalAmount,
        paymentMethod,
        estimatedDelivery: `${estimatedDeliveryStart.toLocaleDateString()} - ${estimatedDeliveryEnd.toLocaleDateString()}`,
      },
    });

    await session.commitTransaction();
    return order[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// const confirmOrderPaymentFromDB = async (
//   orderId: string,
//   salonId: string,
//   hostId: string,
//   userRole: string
//   // payload: IConfirmPaymentPayload
// ): Promise<IOrder> => {
//   console.log('Get all data in::', orderId, salonId, hostId, userRole);
//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     const order = await Order.findOne({ orderId }).populate(
//       'user',
//       'name email'
//     );
//     console.log('Get order data from DB::', order);
//     if (!order) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Order item not found');
//     }

//     if (userRole === USER_ROLES.HOST || userRole === USER_ROLES.USER) {
//       throw new ApiError(
//         StatusCodes.FORBIDDEN,
//         `Only the ${
//           userRole === USER_ROLES.HOST ? 'salon host' : 'order user'
//         } can confirm this order payment`
//       );
//     }

//     if (order.paymentMethod !== 'cash') {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'This method is only for cash payments'
//       );
//     }

//     if (
//       order.status === 'delivered' &&
//       order.paymentMethod === 'cash' &&
//       order.paymentStatus === 'paid'
//     ) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'Product already delivered and payment completed by hand cash'
//       );
//     }

//     const salonOrder = order.salonOrders.find(
//       so => so.salon.toString() === salonId && so.host.toString() === hostId
//     );

//     if (!salonOrder) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Salon order not found');
//     }

//     if (salonOrder.paymentConfirmed) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment already confirmed');
//     }

//     // Update payment confirmation for this salon
//     salonOrder.paymentConfirmed = true;
//     order.status = 'completed';
//     order.paymentStatus = 'paid';
//     // Create income record for this salon's products

//     const incomeData: IIncome = {
//       salon: salonOrder.salon,
//       host: salonOrder.host,
//       order: order._id,
//       type: 'product' as IncomeType,
//       amount: salonOrder.amount,
//       status: 'paid' as IncomeStatus,
//       paymentMethod: 'cash',
//       transactionDate: new Date(),
//       remarks: `Payment confirmed by ${userRole}`,
//     };

//     await IncomeService.createIncome(incomeData);

//     // Check if all salon payments are confirmed
//     const allPaymentsConfirmed = order.salonOrders.every(
//       so => so.paymentConfirmed
//     );
//     if (allPaymentsConfirmed) {
//       order.paymentStatus = 'completed';
//       order.status = 'delivered';

//       // Update product quantities
//       for (const item of order.items) {
//         await Product.findByIdAndUpdate(
//           item.product,
//           {
//             $inc: { quantity: -(item.quantity || 1) },
//           },
//           { session }
//         );
//       }

//       // Notify user that order is confirmed
//       await sendNotifications({
//         userId: order.user.toString(),
//         message: `Order #${order.orderId} has been confirmed. All payments received.`,
//         type: 'PAYMENT',
//       });
//     }

//     await order.save({ session });
//     await session.commitTransaction();

//     return order;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

//multi salon item cart

const confirmOrderPaymentFromDB = async (
  hostId: string,
  orderId: string,
  salonId: string,
  userRole: string
): Promise<IOrder> => {
  console.log(
    'Get all info for confirm order::',
    hostId,
    orderId,
    salonId,
    userRole
  );
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const order = await Order.findOne({ orderId }).populate(
      'user',
      'name email'
    );
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order item not found');
    }

    // Authorization check
    if (userRole !== USER_ROLES.HOST && userRole !== USER_ROLES.USER) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Only the salon host or order user can confirm this order payment'
      );
    }

    // Payment method check
    if (order.paymentMethod !== 'cash') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This method is only for cash payments'
      );
    }

    // Already delivered check
    if (order.status === 'delivered' && order.paymentStatus === 'paid') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Product already delivered and payment completed'
      );
    }

    // Find salon order
    const salonOrder = order.salonOrders.find(
      so => so.salon.toString() === salonId && so.host.toString() === hostId
    );

    if (!salonOrder) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Salon order not found');
    }

    if (salonOrder.paymentConfirmed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment already confirmed');
    }

    // Update payment status
    salonOrder.paymentConfirmed = true;
    salonOrder.status = 'completed';

    // Create income record
    const incomeData: IIncome = {
      salon: salonOrder.salon,
      host: salonOrder.host,
      order: order._id,
      type: 'product',
      amount: salonOrder.amount,
      status: 'paid',
      paymentMethod: 'cash',
      transactionDate: new Date(),
      remarks: `Payment confirmed by ${userRole}`,
    };

    await IncomeService.createIncome(incomeData);

    // Check if all payments confirmed
    const allPaymentsConfirmed = order.salonOrders.every(
      so => so.paymentConfirmed
    );
    if (allPaymentsConfirmed) {
      order.paymentStatus = 'paid';
      order.status = 'delivered';

      // Update product quantities
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -(item.quantity || 1) } },
          { session }
        );
      }

      // Send notification
      await sendNotifications({
        userId: order.user.toString(),
        message: `Order #${order.orderId} has been delivered and payment confirmed.`,
        type: 'PAYMENT',
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
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const completeCartAfterDelivery = async (
  orderId: string,
  userId: string
): Promise<void> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
    }

    if (order.status !== 'confirmed' && order.status !== 'completed') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Order payment must be confirmed before delivery completion'
      );
    }

    // Find the associated cart
    const cart = await Cart.findOne({
      user: userId,
      status: 'pending',
      salon: order.salon,
    });

    if (!cart) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Associated cart not found');
    }

    // Update order status
    order.status = 'completed';
    await order.save({ session });

    // Now we can mark the cart as completed
    cart.status = 'completed';
    await cart.save({ session });

    await session.commitTransaction();
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
  confirmOrderPaymentFromDB,
  createOrderFromSingleCart,
  completeCartAfterDelivery,
};
