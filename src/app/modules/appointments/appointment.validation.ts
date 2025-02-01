// src\app\modules\appointments\appointment.validation.ts
import { z } from 'zod';

const paymentInfoSchema = z.object({
  method: z.enum(['cash', 'visa', 'mastercard', 'paypal']),
  status: z.enum(['pending', 'paid', 'refunded', 'failed']),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
});

const selectedServiceSchema = z.object({
  serviceId: z.string(),
  name: z.string(),
  duration: z.number().min(15),
  price: z.number().min(0),
});

const createAppointmentZodSchema = z.object({
  service: z.string(),
  salon: z.string(),
  appointmentDate: z.string().refine(date => new Date(date) > new Date(), {
    message: 'Appointment date must be in the future',
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Invalid time format. Use HH:MM format',
  }),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Invalid time format. Use HH:MM format',
    })
    .optional(),
  payment: paymentInfoSchema,
  selectedServices: z.array(selectedServiceSchema).min(1, {
    message: 'At least one service must be selected',
  }),
  notes: z.string().optional(),
  totalDuration: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  reminderSent: z.boolean().optional(),
  rescheduleCount: z.number().min(0).optional(),
});

const updateAppointmentZodSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no-show']),
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
  appointmentDate: z.string().refine(date => new Date(date) > new Date(), {
    message: 'New appointment date must be in the future',
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Invalid time format. Use HH:MM format',
  }),
});

const processPaymentZodSchema = z
  .object({
    method: z.enum(['cash', 'visa', 'mastercard', 'paypal']),
    amount: z.number().min(0),
    currency: z.string().default('USD'),
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