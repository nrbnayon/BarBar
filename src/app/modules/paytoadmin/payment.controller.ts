// src/app/modules/paytoadmin/payment.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { PaymentService } from './payment.service';
import { stripe } from '../../../config/stripe';
import sendResponse from '../../../shared/sendResponse';
import { Order } from '../order/order.model';
import ApiError from '../../../errors/ApiError';
import { logger } from '../../../shared/logger';
import { PaymentMethod } from './payment.interface';
import config from '../../../config';

const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userEmail = req.user.email;
  const userName = req.user.name;
  const { type, itemId, paymentMethod } = req.body;

  if (type === 'order') {
    const order = await Order.findOne({ orderId: itemId });
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
    }

    if (order.salonOrders.length === 0) {
      const salonOrdersMap = new Map();

      order.items.forEach(item => {
        const salonId = item.salon.toString();
        if (!salonOrdersMap.has(salonId)) {
          salonOrdersMap.set(salonId, {
            salon: item.salon,
            host: item.host,
            amount: 0,
            items: [],
            status: 'confirmed' as const,
            paymentConfirmed: false,
          });
        }
        const salonOrder = salonOrdersMap.get(salonId);
        if (salonOrder) {
          salonOrder.amount += item.price * (item.quantity ?? 1);
          salonOrder.items.push(item);
        }
      });

      order.salonOrders = Array.from(salonOrdersMap.values());
      await order.save();
    }
  }

  const result = await PaymentService.createPaymentIntent(
    userId,
    userEmail,
    userName,
    type,
    itemId,
    paymentMethod as PaymentMethod
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment intent created successfully',
    data: result,
  });
});

const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  try {
    logger.info('Received webhook request', {
      eventType: req.body.type,
      stripeSignature: sig ? 'present' : 'missing',
    });

    // Verify Stripe signature
    const event = stripe.webhooks.constructEvent(
      (req as any).body,
      sig as string,
      'whsec_5b2525123a8042ae8498d7db60c880688d73467890a9ba547ebcf613fed5fa32'
    );

    logger.info('Webhook event verified', { eventType: event.type });

    switch (event.type) {
      case 'payment_intent.succeeded':
        logger.info('Processing successful payment', {
          paymentIntentId: event.data.object.id,
        });
        await PaymentService.handleSuccessfulPayment(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        logger.info('Processing failed payment', {
          paymentIntentId: event.data.object.id,
        });
        await PaymentService.handleFailedPayment(event.data.object);
        break;

      case 'checkout.session.completed':
        logger.info('Processing completed checkout session', {
          sessionId: event.data.object.id,
        });
        await PaymentService.handleCheckoutCompleted(event.data.object);
        break;

      default:
        logger.info('Unhandled event type', { eventType: event.type });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Webhook error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res
      .status(400)
      .send(
        `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
  }
};

const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    logger.info('Received checkout session request', {
      body: req.body,
      user: req.user,
    });

    const { type, itemId, successUrl, cancelUrl } = req.body;
    const { id: userId, email: userEmail } = req.user;

    if (!type || !itemId || !successUrl || !cancelUrl) {
      logger.error('Missing required fields', { body: req.body });
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing required fields');
    }

    const session = await PaymentService.createCheckoutSession({
      userId,
      userEmail,
      type,
      itemId,
      successUrl,
      cancelUrl,
    });

    logger.info('Checkout session created successfully', {
      sessionId: session.id,
      userId,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Checkout session created successfully',
      url: session.url,
    });
  } catch (error) {
    logger.error('Error in createCheckoutSession controller', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user: req.user,
      body: req.body,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create checkout session'
    );
  }
};

const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await PaymentService.getPaymentHistoryFromDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment history retrieved successfully',
    data: result,
  });
});

export const PaymentController = {
  createPaymentIntent,
  handleWebhook,
  getPaymentHistory,
  createCheckoutSession,
};

// const handleSuccessfulPayment = async (paymentIntent: any) => {
//   const session = await mongoose.startSession();
//   logger.info('Starting payment processing', {
//     paymentIntentId: paymentIntent.id,
//     paymentIntent,
//   });

//   try {
//     session.startTransaction();

//     const payment = await Payment.findOne({
//       stripePaymentIntentId: paymentIntent.id,
//     })
//       .populate('user', 'name email')
//       .populate('order')
//       .populate('appointment');

//     if (!payment) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found');
//     }

//     // Update payment status
//     payment.status = PaymentStatus.COMPLETED;
//     payment.paymentDate = new Date();
//     await payment.save({ session });

//     // Handle Order Payment
//     if (payment.order) {
//       const order = await Order.findById(payment.order)
//         .populate('user', 'name email')
//         .populate('salonOrders.host', 'name email')
//         .populate('salonOrders.salon')
//         .populate('items.product');

//       if (!order) {
//         throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
//       }

//       // Update order status
//       order.paymentStatus = 'paid';
//       order.status = 'confirmed';

//       // Handle salon orders
//       for (const salonOrder of order.salonOrders) {
//         // Update salon order status
//         salonOrder.paymentConfirmed = true;
//         salonOrder.status = 'confirmed';

//         // Calculate commission
//         const { adminCommission, hostAmount } = Payment.calculateCommission(
//           salonOrder.amount
//         );

//         // Create income record for each salon
//         await Income.create(
//           [
//             {
//               salon: salonOrder.salon,
//               host: salonOrder.host,
//               order: order._id,
//               type: 'product',
//               amount: salonOrder.amount,
//               adminCommission,
//               hostAmount,
//               status: 'paid',
//               paymentMethod: payment.paymentMethod,
//               transactionDate: new Date(),
//               remarks: `Card payment confirmed for Order #${order.orderId}`,
//             },
//           ],
//           { session }
//         );

//         // Send notification to host
//         await sendNotifications({
//           type: 'PAYMENT',
//           receiver: salonOrder.host._id,
//           message: `Payment of $${salonOrder.amount} received for Order #${order.orderId}`,
//           metadata: {
//             orderId: order._id,
//             amount: salonOrder.amount,
//             type: 'order',
//             status: 'confirmed',
//             paymentMethod: payment.paymentMethod,
//             customerName: order.user.name,
//             customerEmail: order.user.email,
//             salonName: (salonOrder.salon as any).name,
//           },
//         });

//         // Update product quantities
//         for (const item of salonOrder.items) {
//           await Product.findByIdAndUpdate(
//             item.product,
//             { $inc: { quantity: -(item.quantity || 1) } },
//             { session }
//           );
//         }
//       }

//       await order.save({ session });

//       // Notify customer
//       await sendNotifications({
//         type: 'PAYMENT',
//         receiver: order.user._id,
//         message: `Your payment of $${order.totalAmount} for Order #${order.orderId} has been confirmed`,
//         metadata: {
//           orderId: order._id,
//           amount: order.totalAmount,
//           type: 'order',
//           status: 'confirmed',
//           paymentMethod: payment.paymentMethod,
//         },
//       });
//     }

//     // Handle Appointment Payment
//     else if (payment.appointment) {
//       const appointment = await Appointment.findById(payment.appointment)
//         .populate('user', 'name email')
//         .populate({
//           path: 'salon',
//           populate: {
//             path: 'host',
//             select: 'name email',
//           },
//         })
//         .populate('service', 'name');

//       if (!appointment) {
//         throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
//       }

//       // Update appointment status
//       appointment.payment.status = 'paid';
//       appointment.status = 'confirmed';

//       // Calculate commission
//       const { adminCommission, hostAmount } = Payment.calculateCommission(
//         appointment.price
//       );

//       // Create income record
//       await Income.create(
//         [
//           {
//             salon: appointment.salon,
//             host: (appointment.salon as ISalon).host._id,
//             appointment: appointment._id,
//             type: 'service',
//             amount: appointment.price,
//             adminCommission,
//             hostAmount,
//             status: 'paid',
//             paymentMethod: payment.paymentMethod,
//             transactionDate: new Date(),
//             remarks: `Card payment confirmed for Appointment #${appointment.appointmentId}`,
//           },
//         ],
//         { session }
//       );

//       await appointment.save({ session });

//       // Notify host
//       await sendNotifications({
//         type: 'PAYMENT',
//         receiver: (appointment.salon as ISalon).host._id,
//         message: `Payment of $${appointment.price} received for Appointment #${appointment.appointmentId}`,
//         metadata: {
//           appointmentId: appointment._id,
//           amount: appointment.price,
//           type: 'appointment',
//           status: 'confirmed',
//           paymentMethod: payment.paymentMethod,
//           customerName: appointment.user.name,
//           customerEmail: appointment.user.email,
//           serviceName: appointment.service.name,
//         },
//       });

//       // Notify customer
//       await sendNotifications({
//         type: 'PAYMENT',
//         receiver: appointment.user._id,
//         message: `Your payment of $${appointment.price} for Appointment #${appointment.appointmentId} has been confirmed`,
//         metadata: {
//           appointmentId: appointment._id,
//           amount: appointment.price,
//           type: 'appointment',
//           status: 'confirmed',
//           paymentMethod: payment.paymentMethod,
//           serviceName: appointment.service.name,
//           salonName: (appointment.salon as ISalon).name,
//         },
//       });
//     }

//     // Notify admin
//     await sendNotifications({
//       type: 'ADMIN',
//       message: `New ${payment.paymentMethod} payment processed for ${
//         payment.paymentType
//       } #${payment[payment.paymentType]}`,
//       metadata: {
//         paymentId: payment._id,
//         amount: payment.amount,
//         type: payment.paymentType,
//         status: 'completed',
//         stripePaymentIntentId: payment.stripePaymentIntentId,
//       },
//     });

//     await session.commitTransaction();
//     logger.info('Payment processing completed successfully', {
//       paymentIntentId: paymentIntent.id,
//       paymentType: payment.paymentType,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     logger.error('Error processing payment', {
//       error,
//       paymentIntentId: paymentIntent.id,
//     });
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };
