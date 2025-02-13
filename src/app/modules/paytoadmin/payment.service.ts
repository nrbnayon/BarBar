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
import { IncomeService } from '../income/income.service';
import { IIncome } from '../income/income.interface';
import { PaymentMethod } from './payment.interface';

const createPaymentIntent = async (
  userId: string,
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
    let metadata: Record<string, any> = {};

    if (type === 'order') {
      const order = await Order.findOne({ orderId: String(itemId) })
        .populate('user')
        .populate('items.host');

      if (!order) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
      }

      amount = order.totalAmount;
      host = order.items[0].host._id.toString();
      description = `Payment for Order #${order.orderId}`;
      metadata.orderId = order._id.toString();
    } else {
      const appointment = await Appointment.findById(itemId)
        .populate('service')
        .populate('salon');

      if (!appointment) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
      }

      amount = appointment.price;
      host = (appointment.salon as ISalon).host.toString();
      description = `Payment for Appointment #${appointment.appointmentId}`;
      metadata.appointmentId = appointment._id.toString();
    }

    const { adminCommission, hostAmount } = Payment.calculateCommission(amount);

    metadata.userId = userId;
    metadata.type = type;
    metadata.adminCommission = adminCommission;
    metadata.hostAmount = hostAmount;
    metadata.paymentMethod = paymentMethod;

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    await session.commitTransaction();
    // Create payment record
    const payment = await Payment.create({
      user: userId,
      host,
      [type]: metadata[`${type}Id`],
      amount,
      stripePaymentIntentId: paymentIntent.id,
      paymentType: type === 'order' ? 'product' : 'appointment',
      paymentMethod,
      status: 'pending',
      metadata,
      adminCommission,
      hostAmount,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
    };
  } catch (error) {
    await session.abortTransaction();
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
    });

    if (!payment) {
      throw new Error(`Payment not found for intent ${paymentIntent.id}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(payment, session);
        break;

      case 'payment_intent.payment_failed':
        await handleFailedPayment(payment, session);
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

const handleSuccessfulPayment = async (payment: any, session: any) => {
  payment.status = 'completed';
  payment.paymentDate = new Date();
  await payment.save({ session });

  // Update order or appointment status
  if (payment.order) {
    await Order.findByIdAndUpdate(
      payment.order,
      {
        paymentStatus: 'paid',
        status: 'confirmed',
      },
      { session }
    );
  } else if (payment.appointment) {
    await Appointment.findByIdAndUpdate(
      payment.appointment,
      {
        'payment.status': 'paid',
        status: 'confirmed',
      },
      { session }
    );
  }

  // Create income records
  const incomeData: IIncome = {
    salon: payment.metadata.salonId,
    host: payment.host,
    order: payment.order,
    type: payment.paymentType,
    amount: payment.hostAmount,
    status: 'paid',
    paymentMethod: payment.paymentMethod,
    transactionDate: new Date(),
    remarks: `${payment.paymentMethod} payment completed for ${payment.paymentType}`,
  };

  await IncomeService.createIncome(incomeData);

  // Send notifications
  await sendNotifications({
    type: 'PAYMENT',
    receiver: payment.user,
    message: `Payment successful for ${payment.paymentType}. Amount: $${payment.amount}`,
    metadata: {
      paymentId: payment._id,
      amount: payment.amount,
      type: payment.paymentType,
      method: payment.paymentMethod,
    },
  });

  await sendNotifications({
    type: 'PAYMENT',
    receiver: payment.host,
    message: `New payment received for ${payment.paymentType}. Amount: $${payment.hostAmount}`,
    metadata: {
      paymentId: payment._id,
      amount: payment.hostAmount,
      type: payment.paymentType,
      method: payment.paymentMethod,
    },
  });

  // Notify admin
  await sendNotifications({
    type: 'ADMIN',
    message: `New payment processed. Commission: $${payment.adminCommission}`,
    metadata: {
      paymentId: payment._id,
      amount: payment.amount,
      commission: payment.adminCommission,
      type: payment.paymentType,
      method: payment.paymentMethod,
    },
  });
};

const handleFailedPayment = async (payment: any, session: any) => {
  payment.status = 'failed';
  await payment.save({ session });

  // Send notifications
  await sendNotifications({
    type: 'PAYMENT',
    receiver: payment.user,
    message: `Payment failed for ${payment.paymentType}. Please try again.`,
    metadata: {
      paymentId: payment._id,
      amount: payment.amount,
      type: payment.paymentType,
      method: payment.paymentMethod,
    },
  });

  await sendNotifications({
    type: 'PAYMENT',
    receiver: payment.host,
    message: `Payment failed for ${payment.paymentType}.`,
    metadata: {
      paymentId: payment._id,
      amount: payment.amount,
      type: payment.paymentType,
      method: payment.paymentMethod,
    },
  });
};

const getPaymentHistory = async (userId: string) => {
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
  getPaymentHistory,
};
