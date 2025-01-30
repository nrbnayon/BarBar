// src\app\modules\user\user.validation.ts

import { z } from 'zod';
const createUserZodSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
  role: z.enum(['USER', 'ADMIN', 'HOST']).optional(),
  phone: z.string().optional(),
  image: z.string().optional(),
  profileImage: z.string().url().optional(),
  address: z.string().optional(),
  postCode: z.string().optional(),
  gender: z.enum(['male', 'female', 'both']).optional(),
  dateOfBirth: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Use ISO 8601 format.',
    })
    .optional(),
});

const updateZodSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  postCode: z.string().optional(),
  country: z.string().optional(),
  image: z.string().optional(),
  dateOfBirth: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Use ISO 8601 format.',
    })
    .optional(),
});

const updateLocationZodSchema = z.object({
  body: z.object({
    longitude: z.string({ required_error: 'Longitude is required' }),
    latitude: z.string({ required_error: 'Latitude is required' }),
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateZodSchema,
  updateLocationZodSchema,
};
