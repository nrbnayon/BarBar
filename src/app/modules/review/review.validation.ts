// src/app/modules/review/review.validation.ts
import { z } from 'zod';

const createReviewSchema = z
  .object({
    rating: z.number().min(1).max(5),
    review: z.string().min(1),
    product: z.string().optional(),
    service: z.string().optional(),
  })
  .refine(data => data.product || data.service, {
    message: 'Either product or service ID must be provided',
  })
  .refine(data => !(data.product && data.service), {
    message: 'Cannot review both product and service',
  });

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  review: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const ReviewValidation = {
  createReviewSchema,
  updateReviewSchema,
};
