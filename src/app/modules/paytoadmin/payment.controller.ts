// src/app/modules/paytoadmin/payment.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { PaymentService } from './payment.service';
import { stripe } from '../../../config/stripe';
import sendResponse from '../../../shared/sendResponse';

const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id;
  const { type, itemId, paymentMethod } = req.body; // Include paymentMethod

  const result = await PaymentService.createPaymentIntent(
    userId,
    type,
    itemId,
    paymentMethod
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
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    console.error('❌ Missing Stripe Webhook Secret or Signature');
    return res.status(400).json({ error: 'Webhook signature missing' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('❌ Webhook verification failed:', err);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  // Send response first
  res.json({ received: true });

  // Process event asynchronously
  setImmediate(async () => {
    await PaymentService.handleStripeWebhook(event);
  });
};


const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await PaymentService.getPaymentHistory(userId);

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
};