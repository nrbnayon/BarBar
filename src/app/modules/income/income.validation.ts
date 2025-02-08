import { z } from 'zod';

const createIncomeSchema = z.object({
  body: z.object({
    salon: z.string({
      required_error: 'Salon ID is required',
    }),
    host: z.string({
      required_error: 'Host ID is required',
    }),
    order: z.string({
      required_error: 'Order ID is required',
    }),
    type: z.enum(['service', 'product'], {
      required_error: 'Income type is required',
    }),
    amount: z.number({
      required_error: 'Amount is required',
    }).min(0),
    paymentMethod: z. enum(['cash', 'visa', 'mastercard', 'paypal'], {
      required_error: 'Payment method is required',
    }),
    transactionDate: z.string().or(z.date()),
    bankAccount: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

const updateIncomeStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'paid', 'cancelled']),
    bankAccountId: z.string().optional(),
  }),
});

const generateReportSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const IncomeValidation = {
  createIncomeSchema,
  updateIncomeStatusSchema,
  generateReportSchema,
};