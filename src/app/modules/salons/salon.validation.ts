// // src\app\modules\salons\salon.validation.ts

import { z } from 'zod';

const locationSchema = z.object({
  locationName: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

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

// Initial validation schema for passport and document
const initialSalonZodSchema = z.object({
  passportNum: z.string().min(1, { message: 'Passport number is required' }),
  doc: z.string().min(1, { message: 'Salon document is required' }),
  host: z.string().min(15).optional(),
});

// Complete salon validation schema
const completeSalonZodSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Salon name must be at least 3 characters' }),
  image: z.string().min(1, { message: 'Salon image is required' }).optional(),
  address: locationSchema.optional(),
  phone: z.string().min(1).optional(),
  category: z.string().optional(),
  gender: z.enum(['male', 'female', 'both']).optional(),
  businessHours: z.array(businessHoursSchema).optional(),
  status: z
    .enum(['active', 'inactive', 'pending', 'rejected'])
    .default('pending'),
  remarks: z.string().default('Initial submission'),
});

const updateSalonZodSchema = z.object({
  name: z.string().optional(),
  address: locationSchema.optional(),
  phone: z.string().optional(),
  image: z.string().optional(),
  category: z.string().optional(),
  gender: z.enum(['male', 'female', 'both']).optional(),
  businessHours: z.array(businessHoursSchema).optional(),
  status: z
    .enum(['active', 'inactive', 'pending', 'rejected'])
    .default('pending'),
  remarks: z.string().optional(),
});

const updateSalonStatusZodSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending', 'rejected']),
  remarks: z.string().optional(),
});

export const SalonValidation = {
  initialSalonZodSchema,
  completeSalonZodSchema,
  updateSalonZodSchema,
  updateSalonStatusZodSchema,
};

// import { z } from 'zod';

// const locationSchema = z.object({
//   locationName: z.string().min(1).optional(),
//   latitude: z.number().min(-90).max(90).optional(),
//   longitude: z.number().min(-180).max(180).optional(),
// });

// const businessHoursSchema = z.object({
//   day: z
//     .enum([
//       'Monday',
//       'Tuesday',
//       'Wednesday',
//       'Thursday',
//       'Friday',
//       'Saturday',
//       'Sunday',
//     ])
//     .optional(),
//   startTime: z.string().optional(),
//   endTime: z.string().optional(),
//   isOff: z.boolean().optional(),
// });

// const createSalonZodSchema = z.object({
//   name: z.string().min(3).optional(),
//   passportNum: z.string().min(1, { message: 'Passport number is required' }),
//   doc: z.string().min(3, { message: 'Salon documents  is required' }),
//   image: z.string().min(3).optional(),
//   address: locationSchema.optional(),
//   phone: z.string().min(1).optional(),
//   host: z.string().min(15).optional(),
//   category: z.string().optional(),
//   gender: z.enum(['male', 'female', 'both']).optional(),
//   businessHours: z.array(businessHoursSchema).optional(),
//   status: z
//     .enum(['active', 'inactive', 'pending', 'rejected'])
//     .default('pending'),
//   remarks: z.string().default('Initial submission'),
// });

// const updateSalonZodSchema = z.object({
//   name: z.string().optional(),
//   address: locationSchema.optional(),
//   phone: z.string().optional(),
//   image: z.string().optional(),
//   category: z.string().optional(),
//   gender: z.enum(['male', 'female', 'both']).optional(),
//   businessHours: z.array(businessHoursSchema).optional(),
//   status: z
//     .enum(['active', 'inactive', 'pending', 'rejected'])
//     .default('pending'),
//   remarks: z.string().optional(),
// });

// const updateSalonStatusZodSchema = z.object({
//   status: z.enum(['active', 'inactive', 'pending', 'rejected']),
//   remarks: z.string().optional(),
// });

// export const SalonValidation = {
//   createSalonZodSchema,
//   updateSalonZodSchema,
//   updateSalonStatusZodSchema,
// };
