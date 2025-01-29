import { z } from 'zod';

const createBannerSchema = z.object({
  name: z.string({ required_error: 'Banner name is required' }),
  image: z.string({ required_error: 'Banner image is required' }),
  type: z.enum(['HOST', 'USER'], { required_error: 'Banner type is required' }),
});

const updateBannerSchema = z.object({
  name: z.string().optional(),
  image: z.string().optional(),
  status: z.enum(['active', 'delete']).optional(),
  type: z.enum(['HOST', 'USER']).optional(),
});

export const bannerValidation = {
  createBannerSchema,
  updateBannerSchema,
};
