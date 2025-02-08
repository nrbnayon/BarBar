import { z } from 'zod';

const bankAccountValidationSchema = z.object({
  body: z.object({
    accountHolderName: z.string({
      required_error: 'Account holder name is required',
    }),
    accountNumber: z.string({
      required_error: 'Account number is required',
    }),
    bankName: z.string({
      required_error: 'Bank name is required',
    }),
    branchName: z.string({
      required_error: 'Branch name is required',
    }),
    routingNumber: z.string({
      required_error: 'Routing number is required',
    }),
    swiftCode: z.string().optional(),
    isDefault: z.boolean().optional(),
    verificationDocument: z.string().optional(),
  }),
});

const updateBankAccountValidationSchema = z.object({
  body: z.object({
    accountHolderName: z.string().optional(),
    branchName: z.string().optional(),
    routingNumber: z.string().optional(),
    swiftCode: z.string().optional(),
    isDefault: z.boolean().optional(),
    verificationDocument: z.string().optional(),
  }),
});

const updateBankAccountStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'inactive', 'pending', 'rejected']),
    remarks: z.string().optional(),
  }),
});

export const BankAccountValidation = {
  bankAccountValidationSchema,
  updateBankAccountValidationSchema,
  updateBankAccountStatusSchema,
};