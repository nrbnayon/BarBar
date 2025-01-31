// src\app\modules\services\services.validation.ts
import { z } from 'zod';

const createServiceZodSchema = z.object({
  name: z.string().min(2, { message: 'Service name is required' }),
  image: z.string().min(1).optional(),
  description: z.string().min(10, { message: 'Description is required' }),
  duration: z
    .union([z.number(), z.string()])
    .transform(val => Number(val))
    .refine(val => val >= 15, { message: 'Minimum duration is 15 minutes' }),
  price: z
    .union([z.number(), z.string()])
    .transform(val => Number(val))
    .refine(val => val >= 0, { message: 'Price must be non-negative' }),
  maxAppointmentsPerSlot: z
    .union([z.number(), z.string()])
    .transform(val => Number(val))
    .refine(val => val >= 1, {
      message: 'Must allow at least one appointment per slot',
    }),
  salon: z.string(),
  category: z.string(),
  status: z.enum(['active', 'inactive']).default('active'),
});


const updateServiceZodSchema = createServiceZodSchema.partial();

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
};
