// packages/twenty-server/src/modules/xero-integration/services/xero-invoice.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CustomError } from 'twenty-shared/utils';

import { XeroClientService } from './xero-client.service';

/**
 * Invoice line item structure for Xero API
 */
export interface XeroLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode?: string;
  taxType?: string;
  lineAmount?: number;
}

/**
 * Contact information for Xero invoice
 */
export interface XeroContact {
  contactID?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
}

/**
 * Invoice data structure for creating/updating Xero invoices
 */
export interface XeroInvoiceData {
  contact: XeroContact;
  lineItems: XeroLineItem[];
  date?: Date;
  dueDate?: Date;
  reference?: string;
  invoiceNumber?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED';
  type?: 'ACCREC' | 'ACCPAY'; // ACCREC = Accounts Receivable (Sales), ACCPAY = Accounts Payable (Bills)
  lineAmountTypes?: 'Exclusive' | 'Inclusive' | 'NoTax';
}

/**
 * Xero invoice response structure
 */
export interface XeroInvoice {
  invoiceID: string;
  invoiceNumber: string;
  reference?: string;
  type: string;
  contact: XeroContact;
  date: string;
  dueDate: string;
  status: string;
  lineAmountTypes: string;
  lineItems: XeroLineItem[];
  subTotal: number;
  totalTax: number;
  total: number;
  amountDue: number;
  amountPaid: number;
  currencyCode: string;
  updatedDateUTC: string;
}

/**
 * CRM Opportunity data structure for mapping to Xero invoices
 */
export interface OpportunityInvoiceData {
  buyerEmail: string;
  buyerFirstName: string;
  buyerLastName: string;
  propertyAddress: string;
  invoiceType: 'engagement_fee' | 'success_fee';
  amount: number;
  opportunityId: string;
}

/**
 * Xero API line item structure (PascalCase)
 */
interface XeroApiLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  AccountCode?: string;
  TaxType?: string;
  LineAmount?: number;
}

/**
 * Xero API contact structure (PascalCase)
 */
interface XeroApiContact {
  ContactID?: string;
  Name?: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
}

/**
 * Xero API invoice request structure (PascalCase)
 */
interface XeroApiInvoice {
  InvoiceID?: string;
  Type: string;
  Status: string;
  LineAmountTypes: string;
  Contact?: XeroApiContact;
  LineItems?: XeroApiLineItem[];
  Date?: string;
  DueDate?: string;
  Reference?: string;
  InvoiceNumber?: string;
}

/**
 * Xero API invoice response structure (PascalCase)
 */
interface XeroApiInvoiceResponse {
  InvoiceID: string;
  InvoiceNumber: string;
  Reference?: string;
  Type: string;
  Contact: XeroApiContact;
  Date: string;
  DueDate: string;
  Status: string;
  LineAmountTypes: string;
  LineItems: XeroApiLineItem[];
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  CurrencyCode: string;
  UpdatedDateUTC: string;
}

/**
 * Xero API response wrapper
 */
interface XeroInvoicesResponse {
  Invoices: XeroApiInvoiceResponse[];
}

/**
 * Exception codes for Xero Invoice Service
 */
export enum XeroInvoiceServiceExceptionCode {
  XERO_CLIENT_NOT_AVAILABLE = 'XERO_CLIENT_NOT_AVAILABLE',
  INVOICE_CREATION_FAILED = 'INVOICE_CREATION_FAILED',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
  INVOICE_UPDATE_FAILED = 'INVOICE_UPDATE_FAILED',
  INVALID_INVOICE_DATA = 'INVALID_INVOICE_DATA',
  CONTACT_CREATION_FAILED = 'CONTACT_CREATION_FAILED',
}

/**
 * Service for managing Xero invoices.
 * Handles creation, retrieval, and updates of invoices in Xero.
 * Maps CRM opportunity data to Xero invoice format.
 */
@Injectable()
export class XeroInvoiceService {
  private readonly logger = new Logger(XeroInvoiceService.name);

  // Account codes for different invoice types (should be configured per workspace)
  private readonly ENGAGEMENT_FEE_ACCOUNT_CODE = '200'; // Revenue account
  private readonly SUCCESS_FEE_ACCOUNT_CODE = '200'; // Revenue account
  private readonly TAX_TYPE = 'OUTPUT2'; // GST on Income (10% in Australia)

  constructor(private readonly xeroClientService: XeroClientService) {}

  /**
   * Creates an invoice in Xero
   * @param workspaceId - The workspace ID for multi-tenancy
   * @param invoiceData - Invoice data to create
   * @returns The created Xero invoice
   */
  async createInvoice(
    workspaceId: string,
    invoiceData: XeroInvoiceData,
  ): Promise<XeroInvoice> {
    this.logger.log(
      `Creating invoice for workspace ${workspaceId}, contact: ${invoiceData.contact.name || invoiceData.contact.emailAddress}`,
    );

    try {
      this.validateInvoiceData(invoiceData);

      // Create invoice via Xero API
      const response = await this.xeroClientService.post<XeroInvoicesResponse>(
        workspaceId,
        '/Invoices',
        {
          Invoices: [this.formatInvoiceForXero(invoiceData)],
        },
      );

      if (!response.Invoices || response.Invoices.length === 0) {
        throw new CustomError(
          'Xero API returned empty response when creating invoice',
          XeroInvoiceServiceExceptionCode.INVOICE_CREATION_FAILED,
        );
      }

      return this.formatXeroInvoiceResponse(response.Invoices[0]);
    } catch (error) {
      this.logger.error(
        `Failed to create invoice for workspace ${workspaceId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof CustomError) {
        throw error;
      }

      throw new CustomError(
        `Failed to create invoice: ${error.message}`,
        XeroInvoiceServiceExceptionCode.INVOICE_CREATION_FAILED,
      );
    }
  }

  /**
   * Retrieves an invoice from Xero by ID
   * @param workspaceId - The workspace ID for multi-tenancy
   * @param invoiceId - The Xero invoice ID
   * @returns The Xero invoice
   */
  async getInvoice(
    workspaceId: string,
    invoiceId: string,
  ): Promise<XeroInvoice> {
    this.logger.log(
      `Retrieving invoice ${invoiceId} for workspace ${workspaceId}`,
    );

    try {
      // Retrieve invoice from Xero API
      const response = await this.xeroClientService.get<XeroInvoicesResponse>(
        workspaceId,
        `/Invoices/${invoiceId}`,
      );

      if (!response.Invoices || response.Invoices.length === 0) {
        throw new NotFoundException(`Invoice ${invoiceId} not found`);
      }

      return this.formatXeroInvoiceResponse(response.Invoices[0]);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve invoice ${invoiceId} for workspace ${workspaceId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException || error instanceof CustomError) {
        throw error;
      }

      throw new CustomError(
        `Failed to retrieve invoice: ${error.message}`,
        XeroInvoiceServiceExceptionCode.INVOICE_NOT_FOUND,
      );
    }
  }

  /**
   * Updates an existing invoice in Xero
   * @param workspaceId - The workspace ID for multi-tenancy
   * @param invoiceId - The Xero invoice ID to update
   * @param data - Partial invoice data to update
   * @returns The updated Xero invoice
   */
  async updateInvoice(
    workspaceId: string,
    invoiceId: string,
    data: Partial<XeroInvoiceData>,
  ): Promise<XeroInvoice> {
    this.logger.log(
      `Updating invoice ${invoiceId} for workspace ${workspaceId}`,
    );

    try {
      // Format the update data for Xero API
      const updateData = this.formatInvoiceForXero(data);

      updateData.InvoiceID = invoiceId;

      // Update invoice via Xero API
      const response = await this.xeroClientService.post<XeroInvoicesResponse>(
        workspaceId,
        `/Invoices/${invoiceId}`,
        {
          Invoices: [updateData],
        },
      );

      if (!response.Invoices || response.Invoices.length === 0) {
        throw new CustomError(
          'Xero API returned empty response when updating invoice',
          XeroInvoiceServiceExceptionCode.INVOICE_UPDATE_FAILED,
        );
      }

      return this.formatXeroInvoiceResponse(response.Invoices[0]);
    } catch (error) {
      this.logger.error(
        `Failed to update invoice ${invoiceId} for workspace ${workspaceId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof CustomError) {
        throw error;
      }

      throw new CustomError(
        `Failed to update invoice: ${error.message}`,
        XeroInvoiceServiceExceptionCode.INVOICE_UPDATE_FAILED,
      );
    }
  }

  /**
   * Maps CRM opportunity data to Xero invoice format
   * @param workspaceId - The workspace ID for multi-tenancy
   * @param opportunityData - CRM opportunity data
   * @returns Formatted Xero invoice data
   */
  mapOpportunityToInvoice(
    workspaceId: string,
    opportunityData: OpportunityInvoiceData,
  ): XeroInvoiceData {
    this.logger.log(
      `Mapping opportunity ${opportunityData.opportunityId} to invoice for workspace ${workspaceId}`,
    );

    const contact: XeroContact = {
      firstName: opportunityData.buyerFirstName,
      lastName: opportunityData.buyerLastName,
      emailAddress: opportunityData.buyerEmail,
      name: `${opportunityData.buyerFirstName} ${opportunityData.buyerLastName}`,
    };

    const lineItems: XeroLineItem[] = [
      {
        description: this.getLineItemDescription(opportunityData),
        quantity: 1,
        unitAmount: opportunityData.amount,
        accountCode:
          opportunityData.invoiceType === 'engagement_fee'
            ? this.ENGAGEMENT_FEE_ACCOUNT_CODE
            : this.SUCCESS_FEE_ACCOUNT_CODE,
        taxType: this.TAX_TYPE,
      },
    ];

    const invoiceData: XeroInvoiceData = {
      contact,
      lineItems,
      date: new Date(),
      dueDate: this.calculateDueDate(opportunityData.invoiceType),
      reference: `OPP-${opportunityData.opportunityId}`,
      type: 'ACCREC', // Accounts Receivable (Sales Invoice)
      status: 'DRAFT',
      lineAmountTypes: 'Exclusive', // Amount is exclusive of tax
    };

    return invoiceData;
  }

  /**
   * Validates invoice data before sending to Xero
   * @param invoiceData - Invoice data to validate
   * @throws CustomError if validation fails
   */
  private validateInvoiceData(invoiceData: XeroInvoiceData): void {
    if (!invoiceData.contact) {
      throw new CustomError(
        'Invoice contact is required',
        XeroInvoiceServiceExceptionCode.INVALID_INVOICE_DATA,
      );
    }

    if (
      !invoiceData.contact.contactID &&
      !invoiceData.contact.emailAddress &&
      !invoiceData.contact.name
    ) {
      throw new CustomError(
        'Invoice contact must have either contactID, emailAddress, or name',
        XeroInvoiceServiceExceptionCode.INVALID_INVOICE_DATA,
      );
    }

    if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
      throw new CustomError(
        'Invoice must have at least one line item',
        XeroInvoiceServiceExceptionCode.INVALID_INVOICE_DATA,
      );
    }

    for (const lineItem of invoiceData.lineItems) {
      if (!lineItem.description) {
        throw new CustomError(
          'Line item description is required',
          XeroInvoiceServiceExceptionCode.INVALID_INVOICE_DATA,
        );
      }

      if (lineItem.quantity === undefined || lineItem.quantity <= 0) {
        throw new CustomError(
          'Line item quantity must be greater than 0',
          XeroInvoiceServiceExceptionCode.INVALID_INVOICE_DATA,
        );
      }

      if (lineItem.unitAmount === undefined) {
        throw new CustomError(
          'Line item unitAmount is required',
          XeroInvoiceServiceExceptionCode.INVALID_INVOICE_DATA,
        );
      }
    }
  }

  /**
   * Formats invoice data for Xero API
   * @param data - Invoice data to format
   * @returns Formatted invoice object for Xero API with PascalCase fields
   */
  private formatInvoiceForXero(data: Partial<XeroInvoiceData>): XeroApiInvoice {
    const invoice: XeroApiInvoice = {
      Type: data.type || 'ACCREC',
      Status: data.status || 'DRAFT',
      LineAmountTypes: data.lineAmountTypes || 'Exclusive',
    };

    if (data.contact) {
      invoice.Contact = {
        ContactID: data.contact.contactID,
        Name: data.contact.name,
        FirstName: data.contact.firstName,
        LastName: data.contact.lastName,
        EmailAddress: data.contact.emailAddress,
      };
    }

    if (data.lineItems) {
      invoice.LineItems = data.lineItems.map((item) => ({
        Description: item.description,
        Quantity: item.quantity,
        UnitAmount: item.unitAmount,
        AccountCode: item.accountCode,
        TaxType: item.taxType,
        LineAmount: item.lineAmount,
      }));
    }

    if (data.date) {
      invoice.Date = this.formatDateForXero(data.date);
    }

    if (data.dueDate) {
      invoice.DueDate = this.formatDateForXero(data.dueDate);
    }

    if (data.reference) {
      invoice.Reference = data.reference;
    }

    if (data.invoiceNumber) {
      invoice.InvoiceNumber = data.invoiceNumber;
    }

    return invoice;
  }

  /**
   * Formats Xero API response to our internal invoice structure
   * @param xeroInvoice - Raw Xero invoice response
   * @returns Formatted invoice object
   */
  private formatXeroInvoiceResponse(
    xeroInvoice: XeroApiInvoiceResponse,
  ): XeroInvoice {
    return {
      invoiceID: xeroInvoice.InvoiceID,
      invoiceNumber: xeroInvoice.InvoiceNumber,
      reference: xeroInvoice.Reference,
      type: xeroInvoice.Type,
      contact: {
        contactID: xeroInvoice.Contact.ContactID,
        name: xeroInvoice.Contact.Name,
        firstName: xeroInvoice.Contact.FirstName,
        lastName: xeroInvoice.Contact.LastName,
        emailAddress: xeroInvoice.Contact.EmailAddress,
      },
      date: xeroInvoice.Date,
      dueDate: xeroInvoice.DueDate,
      status: xeroInvoice.Status,
      lineAmountTypes: xeroInvoice.LineAmountTypes,
      lineItems: xeroInvoice.LineItems.map((item) => ({
        description: item.Description,
        quantity: item.Quantity,
        unitAmount: item.UnitAmount,
        accountCode: item.AccountCode,
        taxType: item.TaxType,
        lineAmount: item.LineAmount,
      })),
      subTotal: xeroInvoice.SubTotal,
      totalTax: xeroInvoice.TotalTax,
      total: xeroInvoice.Total,
      amountDue: xeroInvoice.AmountDue,
      amountPaid: xeroInvoice.AmountPaid,
      currencyCode: xeroInvoice.CurrencyCode,
      updatedDateUTC: xeroInvoice.UpdatedDateUTC,
    };
  }

  /**
   * Formats a Date object for Xero API (YYYY-MM-DD format)
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDateForXero(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Generates line item description based on opportunity data
   * @param opportunityData - Opportunity data
   * @returns Line item description
   */
  private getLineItemDescription(
    opportunityData: OpportunityInvoiceData,
  ): string {
    const invoiceType =
      opportunityData.invoiceType === 'engagement_fee'
        ? 'Engagement Fee'
        : 'Success Fee';

    return `${invoiceType} - ${opportunityData.propertyAddress}`;
  }

  /**
   * Calculates due date based on invoice type
   * @param invoiceType - Type of invoice
   * @returns Due date
   */
  private calculateDueDate(
    invoiceType: 'engagement_fee' | 'success_fee',
  ): Date {
    const dueDate = new Date();

    // Engagement fee: due in 7 days
    // Success fee: due in 14 days
    const daysToAdd = invoiceType === 'engagement_fee' ? 7 : 14;

    dueDate.setDate(dueDate.getDate() + daysToAdd);

    return dueDate;
  }
}
