// src\app\modules\cardPayment\card.validation.ts
import { z } from 'zod';
import { isExpiryDateValid, validateCardNumber } from '../../../util/cardUtils';

const cardValidationSchema = z.object({
  body: z
    .object({
      cardHolderName: z.string({
        required_error: 'Card holder name is required',
      }),
      cardNumber: z
        .string({
          required_error: 'Card number is required',
        })
        .refine(num => /^[0-9]{16}$/.test(num), 'Invalid card number format'),
      cardType: z.enum(['card', 'visa', 'mastercard', 'paypal']),
      expiryDate: z
        .string({
          required_error: 'Expiry date is required',
        })
        .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Invalid expiry date (MM/YY)')
        .refine(
          isExpiryDateValid,
          'Card has expired or expiry date is invalid'
        ),
      cvv: z
        .string({
          required_error: 'CVV is required',
        })
        .regex(/^[0-9]{3,4}$/, 'Invalid CVV'),
      email: z.string().email('Invalid email address'),
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
      isDefault: z.boolean().optional(),
    })
    .refine(
      data => validateCardNumber(data.cardNumber, data.cardType),
      'Invalid card number for the specified card type'
    ),
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
