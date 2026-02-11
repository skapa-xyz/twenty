import {
  type WorkflowAction,
  WorkflowActionType,
  type WorkflowXeroCreateInvoiceAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowXeroCreateInvoiceAction = (
  action: WorkflowAction,
): action is WorkflowXeroCreateInvoiceAction => {
  return action.type === WorkflowActionType.XERO_CREATE_INVOICE;
};
