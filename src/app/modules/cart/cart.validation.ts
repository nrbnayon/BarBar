// src\app\modules\cart\cart.validation.ts
import { z } from 'zod';

const addToCartSchema = z.object({
  body: z.object({
    productId: z.string({
      required_error: 'Product ID is required',
    }),
    quantity: z
      .number({
        required_error: 'Quantity is required',
      })
      .min(1),
  }),
});

const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z
      .number({
        required_error: 'Quantity is required',
      })
      .min(1),
  }),
});

export const CartValidation = {
  addToCartSchema,
  updateCartItemSchema,
};
