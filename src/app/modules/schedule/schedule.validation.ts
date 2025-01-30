// src\app\modules\schedule\schedule.validation.ts
import { z } from 'zod';

const createScheduleZodSchema = z.object({
  salonId: z.string(),
  userId: z.string(),
  serviceDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
});

const updateScheduleZodSchema = z.object({
  serviceDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
});

export const ScheduleValidation = {
  createScheduleZodSchema,
  updateScheduleZodSchema,
};
