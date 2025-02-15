// src\app\modules\paytoadmin\payment.service.ts
import { StatusCodes } from 'http-status-codes';
import { stripe } from '../../../config/stripe';
import ApiError from '../../../errors/ApiError';
import { Payment } from './payment.model';
import { Order } from '../order/order.model';
import { Appointment } from '../appointment/appointment.model';
import { sendNotifications } from '../../../helpers/notificationHelper';
import mongoose from 'mongoose';
import { ISalon } from '../salons/salon.interface';
import { Income } from '../income/income.model';
import { User } from '../user/user.model';
import { PaymentMethod, PaymentStatus, PaymentType } from './payment.interface';
import { logger } from '../../../shared/logger';
import { Product } from '../product/product.model';

const createPaymentIntent = async (
  userId: string,
  userEmail: string,
  userName: string,
  type: 'order' | 'appointment',
  itemId: string,
  paymentMethod: PaymentMethod
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    let amount: number;
    let host: string;
    let description: string;
    let metadata: Record<string, string> = {};

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (type === 'order') {
      const order = await Order.findOne({ orderId: itemId })
        .populate('user')
        .populate('salonOrders.salon')
        .populate({
          path: 'salonOrders.host',
          select: 'email name',
        });

      if (!order) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
      }

      if (order.user._id.toString() !== userId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'Unauthorized access to order'
        );
      }

      // Verify payment method matches order
      if (order.paymentMethod === 'cash') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cannot create payment intent for cash orders'
        );
      }

      // Check payment status
      if (
        order.paymentStatus === 'paid' ||
        order.paymentStatus === 'completed'
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'This order has already been paid'
        );
      }

      if (order.status === 'cancelled' || order.status === 'refunded') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cannot process payment for cancelled or refunded orders'
        );
      }

      // Verify all items are still available
      for (const salonOrder of order.salonOrders) {
        for (const item of salonOrder.items) {
          const product = await Product.findById(item.product);
          if (!product) {
            throw new ApiError(
              StatusCodes.NOT_FOUND,
              `Product not found: ${item.product}`
            );
          }
          if (product.quantity < (item.quantity || 0)) {
            throw new ApiError(
              StatusCodes.BAD_REQUEST,
              `Insufficient quantity for product: ${product.name}`
            );
          }
        }
      }

      amount = order.totalAmount * 100;
      host = order.salonOrders[0].host._id.toString();
      description = `Payment for Order #${order.orderId}`;

      metadata.orderId = order._id.toString();
      order.salonOrders.forEach((so, index) => {
        metadata[`salon_${index}_id`] = so.salon._id.toString();
        metadata[`salon_${index}_host`] = so.host._id.toString();
        metadata[`salon_${index}_amount`] = so.amount.toString();
        if (so.salon instanceof mongoose.Types.ObjectId) {
          throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not populated');
        }
        metadata[`salon_${index}_name`] =
          (so.salon as ISalon).name || 'Salon Name';
      });
      metadata.salonOrdersCount = order.salonOrders.length.toString();
    } else {
      const appointment = await Appointment.findById(itemId)
        .populate('service')
        .populate({
          path: 'salon',
          populate: {
            path: 'host',
            select: 'name email',
          },
        })
        .populate('user');

      if (!appointment) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
      }

      if (appointment.user._id.toString() !== userId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'Unauthorized access to appointment'
        );
      }

      // Verify payment method
      if ('method' in appointment.payment && appointment.payment.method === 'cash') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cannot create payment intent for cash appointments'
        );
      }

      // Check payment status
      if (
        appointment.payment.status === 'paid' ||
        appointment.payment.status === 'completed'
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'This appointment has already been paid'
        );
      }

      if (
        appointment.status === 'cancelled' ||
        appointment.status === 'refunded'
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cannot process payment for cancelled or refunded appointments'
        );
      }

      amount = appointment.price * 100;
      if (appointment.salon instanceof mongoose.Types.ObjectId) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not populated');
      }

      const salon = appointment.salon as ISalon;
      host = salon.host._id.toString();
      description = `Payment for Appointment #${appointment.appointmentId}`;
      metadata.appointmentId = appointment._id.toString();
      if (salon && salon._id) {
        metadata.salonId = salon._id.toString();
      } else {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Salon not found');
      }
      metadata.hostId = host;
      if (salon.host instanceof mongoose.Types.ObjectId) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Host not Found for Appointment'
        );
      }
      metadata.hostEmail = (salon.host as any).email;
      metadata.salonName = salon.name;
      metadata.serviceName = appointment.service.name;
    }

    // Verify payment method is supported
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Unsupported payment method');
    }

    // Add customer metadata as strings
    metadata.userId = userId;
    metadata.userEmail = userEmail;
    metadata.userName = userName;
    metadata.type = type;

    let stripeCustomer;
    const existingPayment = await Payment.findOne({ user: userId }).sort({
      createdAt: -1,
    });

    if (existingPayment?.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(
        existingPayment.stripeCustomerId
      );
    } else {
      stripeCustomer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId: userId,
        },
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: stripeCustomer.id,
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: userEmail,
    });

    const payment = await Payment.create({
      user: userId,
      host,
      [type]: metadata[`${type}Id`],
      amount: amount / 100,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomer.id,
      paymentType: type,
      status: 'pending',
      paymentMethod: paymentMethod,
      metadata,
    });

    await session.commitTransaction();
    logger.info('Payment intent created successfully', {
      userId,
      type,
      itemId,
      amount: amount / 100,
      paymentIntentId: paymentIntent.id,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      customerId: stripeCustomer.id,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error creating payment intent', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      type,
      itemId,
    });
    throw error;
  } finally {
    session.endSession();
  }
};

const handleStripeWebhook = async (event: any) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const paymentIntent = event.data.object;
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    }).populate('user', 'name email');

    if (!payment) {
      throw new Error(`Payment not found for intent ${paymentIntent.id}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(payment);
        break;

      case 'payment_intent.payment_failed':
        await handleFailedPayment(payment);
        break;

      default:
        console.warn(`Unhandled webhook event type: ${event.type}`);
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Error processing webhook:', error);
  } finally {
    session.endSession();
  }
};

const handleSuccessfulPayment = async (paymentIntent: any) => {
  const session = await mongoose.startSession();
  logger.info('Starting payment processing', {
    paymentIntentId: paymentIntent.id,
  });

  try {
    session.startTransaction();

    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    })
      .populate('user', 'name email')
      .populate('order')
      .populate('appointment');

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found');
    }

    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.paymentDate = new Date();
    await payment.save({ session });

    // Handle Order Payment
    if (payment.order) {
      const order = await Order.findById(payment.order)
        .populate('user', 'name email')
        .populate('salonOrders.host', 'name email')
        .populate('salonOrders.salon')
        .populate('items.product', 'name images');

      if (!order) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
      }

      // Update order status
      order.paymentStatus = 'paid';
      order.status = 'confirmed';

      // Handle salon orders
      for (const salonOrder of order.salonOrders) {
        // Update salon order status
        salonOrder.paymentConfirmed = true;
        salonOrder.status = 'confirmed';

        // Calculate commission
        const { adminCommission, hostAmount } = Payment.calculateCommission(
          salonOrder.amount
        );

        // Create income record for each salon
        await Income.create(
          [
            {
              salon: salonOrder.salon,
              host: salonOrder.host,
              order: order._id,
              type: 'product',
              amount: salonOrder.amount,
              adminCommission,
              hostAmount,
              status: 'paid',
              paymentMethod: payment.paymentMethod,
              transactionDate: new Date(),
              remarks: `Card payment confirmed for Order #${order.orderId}`,
              confirmBy: {
                _id: order.user._id,
                name: order.user.name,
                email: order.user.email,
              },
            },
          ],
          { session }
        );

        // Get order items for this salon
        const salonItems = order.items.filter(
          item => item.salon.toString() === salonOrder.salon._id.toString()
        );

        // Format items for notification
        const formattedItems = salonItems.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * (item.quantity || 1),
          images: item.product.images,
        }));

        // Send notification to host
        await sendNotifications({
          type: 'PAYMENT',
          receiver: salonOrder.host._id,
          message: `Payment of $${salonOrder.amount} received for Order #${order.orderId}`,
          metadata: {
            orderId: order._id,
            amount: salonOrder.amount,
            type: 'order',
            status: 'confirmed',
            paymentMethod: payment.paymentMethod,
            customerName: order.user.name,
            customerEmail: order.user.email,
            salonName: (salonOrder.salon as ISalon).name,
            items: formattedItems,
            adminCommission,
            hostAmount,
            paymentDate: new Date(),
          },
        });

        // Update product quantities
        for (const item of salonItems) {
          await Product.findByIdAndUpdate(
            item.product._id,
            { $inc: { quantity: -(item.quantity || 1) } },
            { session }
          );
        }
      }

      await order.save({ session });

      // Notify customer
      await sendNotifications({
        type: 'PAYMENT',
        receiver: order.user._id,
        message: `Your payment of $${order.totalAmount} for Order #${order.orderId} has been confirmed`,
        metadata: {
          orderId: order._id,
          amount: order.totalAmount,
          type: 'order',
          status: 'confirmed',
          paymentMethod: payment.paymentMethod,
          orderDetails: {
            items: order.items.map(item => ({
              productName: item.product.name,
              quantity: item.quantity,
              price: item.price,
              totalPrice: item.price * (item.quantity || 1),
              images: item.product.images,
              salonName: (item.salon as any).name,
            })),
            totalAmount: order.totalAmount,
            orderDate: order.createdAt,
            paymentDate: new Date(),
          },
        },
      });
    }

    // Handle Appointment Payment
    else if (payment.appointment) {
      const appointment = await Appointment.findById(payment.appointment)
        .populate('user', 'name email')
        .populate({
          path: 'salon',
          populate: {
            path: 'host',
            select: 'name email',
          },
        })
        .populate('service', 'name price duration');

      if (!appointment) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
      }

      // Update appointment status
      appointment.payment.status = 'paid';
      appointment.status = 'confirmed';

      // Calculate commission
      const { adminCommission, hostAmount } = Payment.calculateCommission(
        appointment.price
      );

      // Create income record
      await Income.create(
        [
          {
            salon: appointment.salon,
            host: (appointment.salon as ISalon).host._id,
            appointment: appointment._id,
            type: 'service',
            amount: appointment.price,
            adminCommission,
            hostAmount,
            status: 'paid',
            paymentMethod: payment.paymentMethod,
            transactionDate: new Date(),
            remarks: `Card payment confirmed for Appointment #${appointment.appointmentId}`,
            confirmBy: {
              _id: appointment.user._id,
              name: appointment.user.name,
              email: appointment.user.email,
            },
          },
        ],
        { session }
      );

      await appointment.save({ session });

      // Notify host
      await sendNotifications({
        type: 'PAYMENT',
        receiver: (appointment.salon as ISalon).host._id,
        message: `Payment of $${appointment.price} received for Appointment #${appointment.appointmentId}`,
        metadata: {
          appointmentId: appointment._id,
          amount: appointment.price,
          type: 'appointment',
          status: 'confirmed',
          paymentMethod: payment.paymentMethod,
          customerName: appointment.user.name,
          customerEmail: appointment.user.email,
          serviceName: appointment.service.name,
          serviceDetails: {
            name: appointment.service.name,
            price: appointment.service.price,
            duration: appointment.service.duration,
          },
          appointmentDate: appointment.appointmentDate,
          adminCommission,
          hostAmount,
          paymentDate: new Date(),
        },
      });

      // Notify customer
      await sendNotifications({
        type: 'PAYMENT',
        receiver: appointment.user._id,
        message: `Your payment of $${appointment.price} for Appointment #${appointment.appointmentId} has been confirmed`,
        metadata: {
          appointmentId: appointment._id,
          amount: appointment.price,
          type: 'appointment',
          status: 'confirmed',
          paymentMethod: payment.paymentMethod,
          serviceName: appointment.service.name,
          salonName: (appointment.salon as ISalon).name,
          appointmentDetails: {
            service: {
              name: appointment.service.name,
              price: appointment.service.price,
              duration: appointment.service.duration,
            },
            appointmentDate: appointment.appointmentDate,
            paymentDate: new Date(),
          },
        },
      });
    }

    // Notify admin
    await sendNotifications({
      type: 'ADMIN',
      message: `New ${payment.paymentMethod} payment processed for ${
        payment.paymentType
      } #${
        payment[payment.paymentType]?.orderId ||
        payment[payment.paymentType]?.appointmentId
      }`,
      metadata: {
        paymentId: payment._id,
        amount: payment.amount,
        type: payment.paymentType,
        status: 'completed',
        stripePaymentIntentId: payment.stripePaymentIntentId,
        paymentDetails: {
          method: payment.paymentMethod,
          date: new Date(),
          amount: payment.amount,
          customerInfo: {
            name: (payment.user as any).name,
            email: (payment.user as any).email,
          },
        },
      },
    });

    await session.commitTransaction();
    logger.info('Payment processing completed successfully', {
      paymentIntentId: paymentIntent.id,
      paymentType: payment.paymentType,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error processing payment', {
      error,
      paymentIntentId: paymentIntent.id,
    });
    throw error;
  } finally {
    session.endSession();
  }
};

const handleFailedPayment = async (paymentIntent: any) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    }).populate('user', 'name email');

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found');
    }

    payment.status = PaymentStatus.FAILED;
    await payment.save({ session });

    if (payment.order) {
      const order = await Order.findById(payment.order)
        .populate('user', 'name email')
        .populate('salonOrders.salon');

      if (order) {
        // Update order status
        order.paymentStatus = 'failed';
        order.status = 'pending';

        // Update paymentConfirmed status for all salon orders
        order.salonOrders.forEach(salonOrder => {
          salonOrder.paymentConfirmed = false;
        });

        await order.save({ session });

        // Notify customer about failed payment
        await sendNotifications({
          type: 'PAYMENT',
          receiver: order.user._id,
          message: `Payment failed for Order #${order.orderId}. Please try again.`,
          metadata: {
            orderId: order._id,
            amount: payment.amount,
            type: 'order',
            error: paymentIntent.last_payment_error?.message,
            status: 'failed',
          },
        });
      }
    } else if (payment.appointment) {
      const appointment = await Appointment.findByIdAndUpdate(
        payment.appointment,
        {
          'payment.status': 'failed',
          status: 'pending',
        },
        { session }
      )
        .populate('user', 'name email')
        .populate('service', 'name');

      if (appointment) {
        // Notify customer about failed appointment payment
        await sendNotifications({
          type: 'PAYMENT',
          receiver: appointment.user._id,
          message: `Payment failed for Appointment #${appointment.appointmentId}. Please try again.`,
          metadata: {
            appointmentId: appointment._id,
            amount: payment.amount,
            type: 'appointment',
            serviceName: appointment.service.name,
            error: paymentIntent.last_payment_error?.message,
          },
        });
      }
    }

    // Notify admin about failed payment
    await sendNotifications({
      type: 'ADMIN',
      message: `Payment failed for ${payment.paymentType} #${
        payment[payment.paymentType]
      }.`,
      metadata: {
        paymentId: payment._id,
        amount: payment.amount,
        type: payment.paymentType,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        customerInfo: payment.metadata,
        error: paymentIntent.last_payment_error?.message,
        status: 'failed',
      },
    });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const createCheckoutSession = async ({
  userId,
  userEmail,
  type,
  itemId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  type: PaymentType;
  itemId: string;
  successUrl: string;
  cancelUrl: string;
}) => {
  try {
    console.log('Starting createCheckoutSession...');
    console.log('Parameters:', {
      userId,
      userEmail,
      type,
      itemId,
      successUrl,
      cancelUrl,
    });

    let amount = 0;
    let metadata = {};

    if (type === PaymentType.ORDER) {
      console.log('Fetching order details...');
      const order = await Order.findOne({ orderId: itemId });
      if (!order) {
        console.error('Order not found:', itemId);
        throw new Error('Order not found');
      }
      amount = order.totalAmount;
      metadata = {
        orderId: order._id.toString(),
        totalAmount: order.totalAmount.toString(),
      };
    } else if (type === PaymentType.APPOINTMENT) {
      console.log('Fetching appointment details...');
      const appointment = await Appointment.findById(itemId);
      if (!appointment) {
        console.error('Appointment not found:', itemId);
        throw new Error('Appointment not found');
      }
      amount = appointment.price;
      metadata = {
        appointmentId: appointment._id.toString(),
        serviceName: appointment.service?.name || 'Unknown Service',
      };
    } else {
      console.error('Invalid payment type:', type);
      throw new Error('Invalid payment type');
    }

    console.log('Creating Stripe checkout session with amount:', amount);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Payment for ${type} #${itemId}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        type,
        itemId: itemId.toString(),
        ...metadata,
      },
    });

    console.log('Checkout session created successfully:', session.id);
    logger.info('Checkout session created', {
      sessionId: session.id,
      metadata,
    });
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    logger.error('Error creating checkout session', {
      error,
      userId,
      type,
      itemId,
    });
    throw error;
  }
};

const handleCheckoutCompleted = async (session: any) => {
  const { type, itemId, userId } = session.metadata;

  try {
    if (type === PaymentType.ORDER) {
      const order = await Order.findOneAndUpdate(
        { orderId: itemId },
        {
          paymentStatus: PaymentStatus.COMPLETED,
          status: 'confirmed',
        },
        { new: true }
      ).populate('user');

      if (order) {
        await sendNotifications({
          type: 'PAYMENT',
          receiver: order.user._id,
          message: `Payment completed for Order #${order.orderId}`,
          metadata: { orderId: order._id },
        });
      }
    } else {
      const appointment = await Appointment.findByIdAndUpdate(
        itemId,
        {
          'payment.status': PaymentStatus.COMPLETED,
          status: 'confirmed',
        },
        { new: true }
      ).populate('user');

      if (appointment) {
        await sendNotifications({
          type: 'PAYMENT',
          receiver: appointment.user._id,
          message: `Payment completed for Appointment #${appointment.appointmentId}`,
          metadata: { appointmentId: appointment._id },
        });
      }
    }

    logger.info('Checkout completed', { session });
  } catch (error) {
    logger.error('Error handling checkout completion', { error });
    throw error;
  }
};

const getPaymentHistoryFromDB = async (userId: string) => {
  return Payment.find({ user: userId })
    .populate('user', 'name email')
    .populate('host', 'name email')
    .populate('order')
    .populate('appointment')
    .sort({ createdAt: -1 });
};

export const PaymentService = {
  createPaymentIntent,
  handleStripeWebhook,
  handleSuccessfulPayment,
  handleFailedPayment,
  getPaymentHistoryFromDB,
  createCheckoutSession,
  handleCheckoutCompleted,
};
