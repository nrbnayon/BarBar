// src\app\modules\payment\payment.validation.ts

import { z } from 'zod';

const createPaymentSchema = z.object({
  body: z.object({
    cartId: z.string({
      required_error: 'Cart ID is required',
    }),
    paymentMethod: z.enum(['cash', 'card', 'visa', 'mastercard', 'paypal'], {
      required_error: 'Payment method is required',
    }),
    cardId: z.string().optional(),
  }),
});

const confirmPaymentSchema = z.object({
  body: z.object({
    paymentIntentId: z.string({
      required_error: 'Payment intent ID is required',
    }),
  }),
});

export const PaymentValidation = {
  createPaymentSchema,
  confirmPaymentSchema,
};