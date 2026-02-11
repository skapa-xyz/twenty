import { z } from 'zod';
import { baseWorkflowActionSettingsSchema } from './base-workflow-action-settings-schema';

export const workflowXeroCreateInvoiceActionSettingsSchema =
  baseWorkflowActionSettingsSchema.extend({
    input: z.object({
      contact: z.object({
        name: z.string().optional(),
        emailAddress: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        contactID: z.string().optional(),
      }),
      lineItems: z.array(
        z.object({
          description: z.string(),
          quantity: z.union([z.number(), z.string()]),
          unitAmount: z.union([z.number(), z.string()]),
          accountCode: z.string().optional(),
          taxType: z.string().optional(),
        }),
      ),
      type: z.enum(['ACCREC', 'ACCPAY']).optional(),
      status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED']).optional(),
      lineAmountTypes: z.enum(['Exclusive', 'Inclusive', 'NoTax']).optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      reference: z.string().optional(),
      invoiceNumber: z.string().optional(),
    }),
  });
