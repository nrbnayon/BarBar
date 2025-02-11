// src\app\modules\order\order.validation.ts
import { Types } from 'mongoose';
import { z } from 'zod';

const createOrderSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        product: z.string().optional(),
        service: z.string().optional(),
        quantity: z.number().optional(),
        price: z.number(),
        salon: z.string(),
        host: z.string(),
      })
    ),
    paymentMethod: z.enum(['cash', 'visa', 'mastercard', 'paypal']),
  }),
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'refunded',
    ]),
    salonId: z.string().optional(),
  }),
});

const checkoutCartSchema = z.object({
  body: z.object({
    paymentMethod: z.enum(['cash', 'visa', 'mastercard', 'paypal']),
  }),
});
const confirmOrderPaymentSchema = z.object({
  body: z.object({
    salonId: z.string().refine(val => Types.ObjectId.isValid(val), {
      message: 'Invalid salon ID, should be a valid salon ObjectId',
    }),
    paymentMethod: z.enum(['cash', 'visa', 'mastercard', 'paypal']).optional(),
  }),
});

export const OrderValidation = {
  createOrderSchema,
  updateOrderStatusSchema,
  checkoutCartSchema,
  confirmOrderPaymentSchema,
};
