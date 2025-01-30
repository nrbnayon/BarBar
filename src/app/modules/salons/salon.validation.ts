// src\app\modules\salons\salon.validation.ts
import { z } from 'zod';

const businessHoursSchema = z.object({
  day: z
    .enum([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ])
    .optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isOff: z.boolean().optional(),
});

const createSalonZodSchema = z.object({
  name: z.string().min(2, { message: 'Name is required' }),
  passportNum: z.string().min(1, { message: 'Passport number is required' }),
  address: z.string().min(1, { message: 'Address is required' }),
  phone: z.string().min(1, { message: 'Phone number is required' }),
  hostId: z.string().min(15, { message: 'hostId / Vendor id  is required' }),
  image: z.string().optional(),
  category: z.string().optional(),
  bannerImage: z.string().optional(),
  gender: z.enum(['male', 'female', 'both']),
  businessHours: z.array(businessHoursSchema).optional(),
});

const updateSalonZodSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  image: z.string().optional(),
  bannerImage: z.string().optional(),
  gender: z.enum(['male', 'female', 'both']).optional(),
  businessHours: z.array(businessHoursSchema).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'rejected']).optional(),
});

export const SalonValidation = {
  createSalonZodSchema,
  updateSalonZodSchema,
};
