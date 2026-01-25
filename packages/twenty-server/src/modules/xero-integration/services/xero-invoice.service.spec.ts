import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { CustomError } from 'twenty-shared/utils';

import {
  XeroInvoiceService,
  type XeroInvoiceData,
} from './xero-invoice.service';
import { XeroClientService } from './xero-client.service';

describe('XeroInvoiceService', () => {
  let service: XeroInvoiceService;
  let xeroClientService: jest.Mocked<XeroClientService>;

  const mockWorkspaceId = 'workspace-123';
  const mockInvoiceId = 'invoice-456';

  const mockInvoiceData: XeroInvoiceData = {
    contact: {
      name: 'John Doe',
      emailAddress: 'john@example.com',
    },
    lineItems: [
      {
        description: 'Engagement Fee - 123 Main St',
        quantity: 1,
        unitAmount: 1000,
        accountCode: '200',
        taxType: 'OUTPUT2',
      },
    ],
    type: 'ACCREC',
    status: 'DRAFT',
    reference: 'OPP-123',
    lineAmountTypes: 'Exclusive',
  };

  const mockXeroInvoiceResponse = {
    Invoices: [
      {
        InvoiceID: mockInvoiceId,
        InvoiceNumber: 'INV-001',
        Reference: 'OPP-123',
        Type: 'ACCREC',
        Contact: {
          Name: 'John Doe',
          EmailAddress: 'john@example.com',
        },
        Date: '2024-01-22',
        DueDate: '2024-01-29',
        Status: 'DRAFT',
        LineAmountTypes: 'Exclusive',
        LineItems: [
          {
            Description: 'Engagement Fee - 123 Main St',
            Quantity: 1,
            UnitAmount: 1000,
            AccountCode: '200',
            TaxType: 'OUTPUT2',
          },
        ],
        SubTotal: 1000,
        TotalTax: 100,
        Total: 1100,
        AmountDue: 1100,
        AmountPaid: 0,
        CurrencyCode: 'AUD',
        UpdatedDateUTC: '2024-01-22T00:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    const mockXeroClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroInvoiceService,
        {
          provide: XeroClientService,
          useValue: mockXeroClient,
        },
      ],
    }).compile();

    service = module.get<XeroInvoiceService>(XeroInvoiceService);
    xeroClientService = module.get(XeroClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      xeroClientService.post.mockResolvedValueOnce(mockXeroInvoiceResponse);

      const result = await service.createInvoice(
        mockWorkspaceId,
        mockInvoiceData,
      );

      expect(result).toBeDefined();
      expect(result.invoiceID).toBe(mockInvoiceId);
      expect(result.invoiceNumber).toBe('INV-001');
      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        '/Invoices',
        expect.objectContaining({
          Invoices: expect.arrayContaining([
            expect.objectContaining({
              Type: 'ACCREC',
              Status: 'DRAFT',
              Contact: expect.any(Object),
              LineItems: expect.any(Array),
            }),
          ]),
        }),
      );
    });

    it('should throw error when invoice data is invalid', async () => {
      const invalidData: XeroInvoiceData = {
        contact: { name: 'John Doe' },
        lineItems: [],
      };

      await expect(
        service.createInvoice(mockWorkspaceId, invalidData),
      ).rejects.toThrow(CustomError);
    });

    it('should throw error when Xero API returns empty response', async () => {
      xeroClientService.post.mockResolvedValueOnce({ Invoices: [] });

      await expect(
        service.createInvoice(mockWorkspaceId, mockInvoiceData),
      ).rejects.toThrow(CustomError);
    });
  });

  describe('getInvoice', () => {
    it('should retrieve an invoice successfully', async () => {
      xeroClientService.get.mockResolvedValueOnce(mockXeroInvoiceResponse);

      const result = await service.getInvoice(mockWorkspaceId, mockInvoiceId);

      expect(result).toBeDefined();
      expect(result.invoiceID).toBe(mockInvoiceId);
      expect(xeroClientService.get).toHaveBeenCalledWith(
        mockWorkspaceId,
        `/Invoices/${mockInvoiceId}`,
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      xeroClientService.get.mockResolvedValueOnce({ Invoices: [] });

      await expect(
        service.getInvoice(mockWorkspaceId, mockInvoiceId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInvoice', () => {
    it('should update an invoice successfully', async () => {
      xeroClientService.post.mockResolvedValueOnce(mockXeroInvoiceResponse);

      const updateData = { status: 'AUTHORISED' as const };
      const result = await service.updateInvoice(
        mockWorkspaceId,
        mockInvoiceId,
        updateData,
      );

      expect(result).toBeDefined();
      expect(result.invoiceID).toBe(mockInvoiceId);
      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        `/Invoices/${mockInvoiceId}`,
        expect.objectContaining({
          Invoices: expect.arrayContaining([
            expect.objectContaining({
              InvoiceID: mockInvoiceId,
            }),
          ]),
        }),
      );
    });

    it('should throw error when update fails', async () => {
      xeroClientService.post.mockResolvedValueOnce({ Invoices: [] });

      await expect(
        service.updateInvoice(mockWorkspaceId, mockInvoiceId, {}),
      ).rejects.toThrow(CustomError);
    });
  });

  describe('mapOpportunityToInvoice', () => {
    it('should map opportunity data to invoice format correctly', () => {
      const opportunityData = {
        buyerEmail: 'buyer@example.com',
        buyerFirstName: 'Jane',
        buyerLastName: 'Smith',
        propertyAddress: '456 Oak Ave',
        invoiceType: 'engagement_fee' as const,
        amount: 2000,
        opportunityId: 'opp-789',
      };

      const result = service.mapOpportunityToInvoice(
        mockWorkspaceId,
        opportunityData,
      );

      expect(result.contact.name).toBe('Jane Smith');
      expect(result.contact.emailAddress).toBe('buyer@example.com');
      expect(result.lineItems[0].unitAmount).toBe(2000);
      expect(result.lineItems[0].description).toContain('Engagement Fee');
      expect(result.lineItems[0].description).toContain('456 Oak Ave');
      expect(result.reference).toBe('OPP-opp-789');
      expect(result.type).toBe('ACCREC');
      expect(result.status).toBe('DRAFT');
    });
  });
});
