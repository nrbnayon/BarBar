import { z } from 'zod';
const createUserZodSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['USER', 'ADMIN', 'HOST']).optional(),
  phone: z.string().optional(),
  image: z.string().optional(),
  profileImage: z.string().url().optional(),
  address: z.string().optional(),
  postCode: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z
    .string()
    .datetime({ message: 'Invalid date format. Use ISO 8601 format.' }),
});

const updateZodSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  postCode: z.string().optional(),
  country: z.string().optional(),
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
