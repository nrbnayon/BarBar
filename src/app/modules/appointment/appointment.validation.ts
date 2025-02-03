// src\app\modules\appointment\appointment.validation.ts
import { z } from 'zod';

const createAppointmentZodSchema = z.object({
  body: z.object({
    service: z.string(),
    appointmentDate: z.string().refine(date => new Date(date) > new Date(), {
      message: 'Appointment date must be in the future',
    }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Invalid time format. Use 24-hour format (HH:MM)',
    }),
    payment: z.object({
      method: z.enum(['cash', 'visa', 'mastercard', 'paypal']),
    }),
    notes: z.string().optional(),
  }),
});

const updateAppointmentZodSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no-show']).optional(),
  payment: z
    .object({
      status: z.enum(['pending', 'paid', 'refunded', 'failed']),
      transactionId: z.string().optional(),
    })
    .optional(),
  cancellationReason: z.string().optional(),
  notes: z.string().optional(),
});

const rescheduleAppointmentZodSchema = z.object({
  body: z.object({
    appointmentDate: z.string().refine(date => new Date(date) > new Date(), {
      message: 'New appointment date must be in the future',
    }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Invalid time format. Use HH:MM format',
    }),
  }),
});

const processPaymentZodSchema = z
  .object({
    method: z.enum(['cash', 'visa', 'mastercard', 'paypal']),
    cardNumber: z.string().optional(),
    cardHolderName: z.string().optional(),
    expiryDate: z.string().optional(),
    cvv: z.string().optional(),
  })
  .refine(
    data => {
      if (data.method !== 'cash') {
        return (
          data.cardNumber && data.cardHolderName && data.expiryDate && data.cvv
        );
      }
      return true;
    },
    {
      message: 'Card details are required for card payments',
    }
  );

export const AppointmentValidation = {
  createAppointmentZodSchema,
  updateAppointmentZodSchema,
  rescheduleAppointmentZodSchema,
  processPaymentZodSchema,
};
