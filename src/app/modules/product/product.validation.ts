import { z } from 'zod';

const createProductSchema = z.object({
  body: z.object({
    salonName: z.string({
      required_error: 'Salon name is required',
    }),
    name: z.string({
      required_error: 'Product name is required',
    }),
    description: z.string({
      required_error: 'Product description is required',
    }),
    price: z.coerce
      .number({
        required_error: 'Price is required',
      })
      .min(0),
    quantity: z.coerce
      .number({
        required_error: 'Quantity is required',
      })
      .min(0),
    gender: z.enum(['male', 'female', 'both']),
    salon: z.string({
      required_error: 'Salon ID is required',
    }),
    host: z.string().optional(),
    status: z.enum(['active', 'inactive']).default('active'),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.coerce.number().min(0).optional(),
    quantity: z.coerce.number().min(0).optional(),
    gender: z.enum(['male', 'female', 'both']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

export const ProductValidation = {
  createProductSchema,
  updateProductSchema,
};
