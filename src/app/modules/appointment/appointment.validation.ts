// src\app\modules\appointment\appointment.validation.ts
import { z } from 'zod';

const createAppointmentZodSchema = z.object({
  body: z
    .object({
      service: z.string(),
      appointmentDate: z.string().refine(
        date => {
          const appointmentDate = new Date(date);
          const today = new Date();
          appointmentDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          return appointmentDate >= today;
        },
        {
          message: 'Appointment date cannot be in the past',
        }
      ),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Invalid time format. Use 24-hour format (HH:MM)',
      }),
      payment: z.object({
        method: z.enum(['cash', 'visa', 'mastercard', 'paypal']),
      }),
      notes: z.string().optional(),
    })
    .refine(
      data => {
        const appointmentDateTime = new Date(data.appointmentDate);
        const [hours, minutes] = data.startTime.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        return appointmentDateTime > new Date();
      },
      {
        message: 'Appointment time must be in the future',
        path: ['startTime'],
      }
    ),
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

const processPaymentZodSchema = z.object({
  body: z
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
            data.cardNumber &&
            data.cardHolderName &&
            data.expiryDate &&
            data.cvv
          );
        }
        return true;
      },
      {
        message: 'Card details are required for card payments',
      }
    ),
});

const confirmCashPaymentSchema = z.object({
  params: z.object({
    id: z.string({
      required_error: 'Appointment ID is required',
    }),
  }),
  body: z.object({
    status: z.enum(['completed'], {
      required_error: 'Status must be completed',
    }),
    payment: z.object({
      method: z.enum(['cash'], {
        required_error: 'Payment method must be cash',
      }),
      status: z.enum(['paid'], {
        required_error: 'Payment status must be paid',
      }),
    }),
  }),
});

export const AppointmentValidation = {
  createAppointmentZodSchema,
  updateAppointmentZodSchema,
  rescheduleAppointmentZodSchema,
  processPaymentZodSchema,
  confirmCashPaymentSchema,
};
