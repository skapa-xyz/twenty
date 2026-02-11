import { z } from 'zod';
import { baseWorkflowActionSchema } from './base-workflow-action-schema';
import { workflowXeroCreateInvoiceActionSettingsSchema } from './xero-create-invoice-action-settings-schema';

export const workflowXeroCreateInvoiceActionSchema =
  baseWorkflowActionSchema.extend({
    type: z.literal('XERO_CREATE_INVOICE'),
    settings: workflowXeroCreateInvoiceActionSettingsSchema,
  });
