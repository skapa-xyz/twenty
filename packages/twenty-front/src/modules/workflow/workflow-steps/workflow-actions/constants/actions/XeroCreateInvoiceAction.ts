import { type WorkflowActionType } from '@/workflow/types/Workflow';

export const XERO_CREATE_INVOICE_ACTION: {
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'XERO_CREATE_INVOICE'>;
  icon: string;
} = {
  defaultLabel: 'Create Xero Invoice',
  type: 'XERO_CREATE_INVOICE',
  icon: 'IconFileInvoice',
};
