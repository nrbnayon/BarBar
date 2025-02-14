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

// const handleWebhook = async (req: Request, res: Response) => {
//   const sig = req.headers['stripe-signature'];

//   try {
//     const event = stripe.webhooks.constructEvent(
//       req.body,
//       sig as string,
//       config.payment.stripe_webhook_cli_secret as string
//     );

//     if (event.type === 'payment_intent.succeeded') {
//       await PaymentService.handleSuccessfulPayment(event.data.object);
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     res.status(400).send(`Webhook Error: ${(err as Error).message}`);
//   }
// };

const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  try {
    // ⚠️ Ensure the raw body is used for signature verification
    const event = stripe.webhooks.constructEvent(
      (req as any).body, // This is now raw body, thanks to express.raw()
      sig as string,
      'whsec_5b2525123a8042ae8498d7db60c880688d73467890a9ba547ebcf613fed5fa32'
    );

    console.log(`✅ Received Stripe Event: ${event.type}`);

    if (event.type === 'payment_intent.succeeded') {
      console.log('💰 Payment succeeded:', event.data.object);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Webhook Error:', err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
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

    // Validate required fields
    if (!type || !itemId || !successUrl || !cancelUrl) {
      logger.error('Missing required fields', { body: req.body });
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing required fields');
    }

    // Create checkout session
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

    // Send response
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
