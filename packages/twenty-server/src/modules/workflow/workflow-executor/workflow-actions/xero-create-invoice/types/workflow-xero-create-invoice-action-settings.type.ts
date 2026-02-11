import { type WorkflowXeroCreateInvoiceActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/xero-create-invoice/types/workflow-xero-create-invoice-action-input.type';
import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';

export type WorkflowXeroCreateInvoiceActionSettings =
  BaseWorkflowActionSettings & {
    input: WorkflowXeroCreateInvoiceActionInput;
  };
