// src\app\modules\paytoadmin\payment.validation.ts
import { z } from 'zod';

const createPaymentIntentSchema = z.object({
  body: z.object({
    type: z.enum(['order', 'appointment']),
    itemId: z.string({
      required_error: 'Item ID is required',
    }),
    paymentMethod: z.enum(['visa', 'mastercard', 'paypal'], {
      required_error: 'Payment method is required',
      invalid_type_error: 'Invalid payment method',
    }),
  }),
});

export const PaymentValidation = {
  createPaymentIntentSchema,
};