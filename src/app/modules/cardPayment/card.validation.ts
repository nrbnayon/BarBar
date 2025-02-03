import { z } from 'zod';

const cardValidationSchema = z.object({
  cardHolderName: z.string({
    required_error: 'Card holder name is required',
  }),
  cardNumber: z
    .string({
      required_error: 'Card number is required',
    })
    .regex(/^[0-9]{16}$/, 'Invalid card number'),
  cardType: z.enum(['visa', 'mastercard', 'paypal']),
  expiryDate: z
    .string({
      required_error: 'Expiry date is required',
    })
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Invalid expiry date (MM/YY)'),
  cvv: z
    .string({
      required_error: 'CVV is required',
    })
    .regex(/^[0-9]{3,4}$/, 'Invalid CVV'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  isDefault: z.boolean().optional(),
});

const updateCardValidationSchema = z.object({
  cardHolderName: z.string().optional(),
  expiryDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Invalid expiry date (MM/YY)')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
  isDefault: z.boolean().optional(),
});

export const CardValidation = {
  cardValidationSchema,
  updateCardValidationSchema,
};
