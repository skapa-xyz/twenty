export type WorkflowXeroCreateInvoiceActionInput = {
  contact: {
    name?: string;
    emailAddress?: string;
    firstName?: string;
    lastName?: string;
    contactID?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    accountCode?: string;
    taxType?: string;
  }>;
  type?: 'ACCREC' | 'ACCPAY';
  status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
  lineAmountTypes?: 'Exclusive' | 'Inclusive' | 'NoTax';
  date?: string;
  dueDate?: string;
  reference?: string;
  invoiceNumber?: string;
};
