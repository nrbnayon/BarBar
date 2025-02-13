// src\app\modules\payment\payment.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PaymentService } from './payment.service';
import Stripe from 'stripe';
import config from '../../../config';

const stripe = new Stripe(config.payment.stripe_secret_key as string, {
  apiVersion: '2024-09-30.acacia',
});

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { cartId, paymentMethod, cardId } = req.body;

  const result = await PaymentService.createPayment(
    userId,
    cartId,
    paymentMethod,
    cardId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment initiated successfully',
    data: result,
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { paymentIntentId } = req.body;

  const result = await PaymentService.confirmPayment(userId, paymentIntentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment confirmed successfully',
    data: result,
  });
});

const getUserPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await PaymentService.getUserPayments(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User payments retrieved successfully',
    data: result,
  });
});

const getHostPayments = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  const result = await PaymentService.getHostPayments(hostId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Host payments retrieved successfully',
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const filters = req.query;
  const result = await PaymentService.getAllPaymentsFromDB(filters);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payments retrieved successfully',
    data: result,
  });
});

const stripeWebhookController = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      config.payment.stripe_webhook_secret as string
    );

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Handle successful payment
        await PaymentService.confirmPayment(
          paymentIntent.metadata.userId,
          paymentIntent.id
        );
        break;
      case 'payment_intent.payment_failed':
        // Handle failed payment
        console.log('Payment failed:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err);
    if (err instanceof Error) {
      res.status(400).send(`Webhook Error: ${err.message}`);
    } else {
      res.status(400).send('Webhook Error');
    }
  }
};

export const PaymentController = {
  createPayment,
  confirmPayment,
  getUserPayments,
  getHostPayments,
  getAllPayments,
  stripeWebhookController,
};
