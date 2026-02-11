import { Injectable, Logger } from '@nestjs/common';

import { resolveInput } from 'twenty-shared/utils';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowXeroCreateInvoiceAction } from 'src/modules/workflow/workflow-executor/workflow-actions/xero-create-invoice/guards/is-workflow-xero-create-invoice-action.guard';
import { type WorkflowXeroCreateInvoiceActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/xero-create-invoice/types/workflow-xero-create-invoice-action-input.type';
import {
  XeroInvoiceService,
  type XeroInvoiceData,
} from 'src/modules/xero-integration/services/xero-invoice.service';

@Injectable()
export class XeroCreateInvoiceWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(
    XeroCreateInvoiceWorkflowAction.name,
  );

  constructor(
    private readonly xeroInvoiceService: XeroInvoiceService,
  ) {}

  async execute({
    currentStepId,
    steps,
    runInfo,
    context,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({
      stepId: currentStepId,
      steps,
    });

    if (!isWorkflowXeroCreateInvoiceAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a Xero create invoice action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const resolvedInput = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowXeroCreateInvoiceActionInput;

    try {
      const invoiceData: XeroInvoiceData = {
        contact: resolvedInput.contact,
        lineItems: resolvedInput.lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitAmount: Number(item.unitAmount),
          accountCode: item.accountCode,
          taxType: item.taxType,
        })),
        type: resolvedInput.type,
        status: resolvedInput.status,
        lineAmountTypes: resolvedInput.lineAmountTypes,
        date: resolvedInput.date ? new Date(resolvedInput.date) : undefined,
        dueDate: resolvedInput.dueDate
          ? new Date(resolvedInput.dueDate)
          : undefined,
        reference: resolvedInput.reference,
        invoiceNumber: resolvedInput.invoiceNumber,
      };

      const invoice = await this.xeroInvoiceService.createInvoice(
        runInfo.workspaceId,
        invoiceData,
      );

      this.logger.log(
        `Created Xero invoice ${invoice.invoiceID} for workspace ${runInfo.workspaceId}`,
      );

      return {
        result: {
          invoiceID: invoice.invoiceID,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: invoice.total,
          amountDue: invoice.amountDue,
          currencyCode: invoice.currencyCode,
          reference: invoice.reference,
          date: invoice.date,
          dueDate: invoice.dueDate,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Xero invoice for workspace ${runInfo.workspaceId}: ${error.message}`,
        error.stack,
      );

      return {
        error: error.message,
      };
    }
  }
}
