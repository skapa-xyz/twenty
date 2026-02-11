import { Module } from '@nestjs/common';

import { XeroModule } from 'src/modules/xero-integration/xero.module';
import { XeroCreateInvoiceWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/xero-create-invoice/xero-create-invoice.workflow-action';

@Module({
  imports: [XeroModule],
  providers: [XeroCreateInvoiceWorkflowAction],
  exports: [XeroCreateInvoiceWorkflowAction],
})
export class XeroCreateInvoiceActionModule {}
