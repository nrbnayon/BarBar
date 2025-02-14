// src\app\modules\paytoadmin\payment.validation.ts
import { z } from 'zod';
import { PaymentType } from './payment.interface';

const createPaymentIntentSchema = z.object({
  body: z.object({
    type: z.enum(['order', 'appointment']),
    itemId: z.string({
      required_error: 'Item ID is required',
    }),
    paymentMethod: z.enum(['card', 'visa', 'mastercard', 'paypal'] as const, {
      required_error: 'Payment method is required',
      invalid_type_error: 'Invalid payment method',
    }),
  }),
});

const createCheckoutSessionSchema = z.object({
  body: z.object({
    type: z.nativeEnum(PaymentType),
    itemId: z.string(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
  }),
});

export const PaymentValidation = {
  createPaymentIntentSchema,
  createCheckoutSessionSchema,
};

