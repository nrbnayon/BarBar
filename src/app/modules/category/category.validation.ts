import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string({ required_error: 'Category name is required' }),
  image: z.string({ required_error: 'Category image is required' }),
});

const updatedCategorySchema = z.object({
  name: z.string().optional(),
  image: z.string().optional(),
  status: z.enum(['active', 'delete']).optional(),
});

export const CategoryValidation = {
  createCategorySchema,
  updatedCategorySchema,
};
