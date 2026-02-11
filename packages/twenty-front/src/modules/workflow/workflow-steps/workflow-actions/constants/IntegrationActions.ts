import { type WorkflowActionType } from '@/workflow/types/Workflow';
import { XERO_CREATE_INVOICE_ACTION } from '@/workflow/workflow-steps/workflow-actions/constants/actions/XeroCreateInvoiceAction';

export const INTEGRATION_ACTIONS: Array<{
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'XERO_CREATE_INVOICE'>;
  icon: string;
}> = [XERO_CREATE_INVOICE_ACTION];
