// src\app\modules\order\order.validation.ts
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

export const OrderValidation = {
  createOrderSchema,
  updateOrderStatusSchema,
  checkoutCartSchema,
};
