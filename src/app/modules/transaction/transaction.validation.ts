import { z } from 'zod';

const processPaymentSchema = z.object({
  type: z.enum(['appointment', 'product']),
  itemId: z.string(),
  cardId: z.string(),
  quantity: z.number().optional(),
});

export const TransactionValidation = {
  processPaymentSchema,
};
