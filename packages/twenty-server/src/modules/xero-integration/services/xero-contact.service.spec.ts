import { Test, type TestingModule } from '@nestjs/testing';

import type {
  CRMContactData,
  XeroContact,
  XeroContactResponse,
} from 'src/modules/xero-integration/types/xero-contact.types';

import { XeroContactService } from './xero-contact.service';
import { XeroClientService } from './xero-client.service';

describe('XeroContactService', () => {
  let service: XeroContactService;
  let xeroClientService: jest.Mocked<XeroClientService>;

  const mockWorkspaceId = 'workspace-123';
  const mockContactId = 'contact-456';

  const mockXeroContact: XeroContact = {
    contactID: mockContactId,
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    emailAddress: 'john@example.com',
    contactStatus: 'ACTIVE',
    isCustomer: true,
    phones: [
      {
        phoneType: 'DEFAULT',
        phoneNumber: '+61412345678',
      },
    ],
  };

  const mockCRMContactData: CRMContactData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+61412345678',
    city: 'Sydney',
  };

  beforeEach(async () => {
    const mockXeroClient = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroContactService,
        {
          provide: XeroClientService,
          useValue: mockXeroClient,
        },
      ],
    }).compile();

    service = module.get<XeroContactService>(XeroContactService);
    xeroClientService = module.get(XeroClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateContact', () => {
    it('should return existing contact when found by email', async () => {
      const mockResponse: XeroContactResponse = {
        contacts: [mockXeroContact],
      };

      xeroClientService.get.mockResolvedValueOnce(mockResponse);

      const result = await service.findOrCreateContact(
        mockWorkspaceId,
        mockCRMContactData,
      );

      expect(result).toEqual(mockXeroContact);
      expect(xeroClientService.get).toHaveBeenCalledWith(
        mockWorkspaceId,
        '/Contacts',
        expect.objectContaining({
          params: {
            where: `EmailAddress=="${mockCRMContactData.email}"`,
          },
        }),
      );
      expect(xeroClientService.post).not.toHaveBeenCalled();
    });

    it('should create new contact when not found by email', async () => {
      // First call returns empty (contact not found)
      xeroClientService.get.mockResolvedValueOnce({ contacts: [] });

      // Second call creates the contact
      const createResponse: XeroContactResponse = {
        contacts: [mockXeroContact],
      };

      xeroClientService.post.mockResolvedValueOnce(createResponse);

      const result = await service.findOrCreateContact(
        mockWorkspaceId,
        mockCRMContactData,
      );

      expect(result).toEqual(mockXeroContact);
      expect(xeroClientService.get).toHaveBeenCalled();
      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        '/Contacts',
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              name: 'John Doe',
              firstName: 'John',
              lastName: 'Doe',
              emailAddress: 'john@example.com',
              isCustomer: true,
            }),
          ]),
        }),
      );
    });

    it('should create contact with company name when provided', async () => {
      const companyContactData: CRMContactData = {
        companyName: 'Acme Corp',
        email: 'info@acme.com',
      };

      xeroClientService.get.mockResolvedValueOnce({ contacts: [] });
      xeroClientService.post.mockResolvedValueOnce({
        contacts: [{ ...mockXeroContact, name: 'Acme Corp' }],
      });

      await service.findOrCreateContact(mockWorkspaceId, companyContactData);

      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        '/Contacts',
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              name: 'Acme Corp',
            }),
          ]),
        }),
      );
    });

    it('should throw error when contact data is invalid', async () => {
      const invalidData: CRMContactData = {};

      await expect(
        service.findOrCreateContact(mockWorkspaceId, invalidData),
      ).rejects.toThrow(
        'Contact data must include at least an email, name, or company name',
      );
    });

    it('should handle contact without email', async () => {
      const noEmailData: CRMContactData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      xeroClientService.post.mockResolvedValueOnce({
        contacts: [{ ...mockXeroContact, emailAddress: undefined }],
      });

      const result = await service.findOrCreateContact(
        mockWorkspaceId,
        noEmailData,
      );

      expect(result).toBeDefined();
      expect(xeroClientService.get).not.toHaveBeenCalled();
      expect(xeroClientService.post).toHaveBeenCalled();
    });
  });

  describe('getContact', () => {
    it('should return contact when found', async () => {
      const mockResponse: XeroContactResponse = {
        contacts: [mockXeroContact],
      };

      xeroClientService.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getContact(mockWorkspaceId, mockContactId);

      expect(result).toEqual(mockXeroContact);
      expect(xeroClientService.get).toHaveBeenCalledWith(
        mockWorkspaceId,
        `/Contacts/${mockContactId}`,
      );
    });

    it('should return null when contact not found (404)', async () => {
      const notFoundError = new Error('Not found');

      (notFoundError as any).response = { status: 404 };

      xeroClientService.get.mockRejectedValueOnce(notFoundError);

      const result = await service.getContact(mockWorkspaceId, mockContactId);

      expect(result).toBeNull();
    });

    it('should return null when contacts array is empty', async () => {
      xeroClientService.get.mockResolvedValueOnce({ contacts: [] });

      const result = await service.getContact(mockWorkspaceId, mockContactId);

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const serverError = new Error('Server error');

      (serverError as any).response = { status: 500 };

      xeroClientService.get.mockRejectedValueOnce(serverError);

      await expect(
        service.getContact(mockWorkspaceId, mockContactId),
      ).rejects.toThrow();
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      const updateData: CRMContactData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      };

      const updatedContact = {
        ...mockXeroContact,
        firstName: 'Jane',
        lastName: 'Smith',
        name: 'Jane Smith',
        emailAddress: 'jane.smith@example.com',
      };

      xeroClientService.post.mockResolvedValueOnce({
        contacts: [updatedContact],
      });

      const result = await service.updateContact(
        mockWorkspaceId,
        mockContactId,
        updateData,
      );

      expect(result).toEqual(updatedContact);
      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        `/Contacts/${mockContactId}`,
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              ContactID: mockContactId,
              name: 'Jane Smith',
              firstName: 'Jane',
              lastName: 'Smith',
              emailAddress: 'jane.smith@example.com',
            }),
          ]),
        }),
      );
    });

    it('should update phone number', async () => {
      const updateData: CRMContactData = {
        phone: '+61498765432',
      };

      xeroClientService.post.mockResolvedValueOnce({
        contacts: [mockXeroContact],
      });

      await service.updateContact(mockWorkspaceId, mockContactId, updateData);

      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        `/Contacts/${mockContactId}`,
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              phones: [
                {
                  phoneType: 'DEFAULT',
                  phoneNumber: '+61498765432',
                },
              ],
            }),
          ]),
        }),
      );
    });

    it('should update city address', async () => {
      const updateData: CRMContactData = {
        city: 'Melbourne',
      };

      xeroClientService.post.mockResolvedValueOnce({
        contacts: [mockXeroContact],
      });

      await service.updateContact(mockWorkspaceId, mockContactId, updateData);

      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        `/Contacts/${mockContactId}`,
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              addresses: [
                {
                  addressType: 'STREET',
                  city: 'Melbourne',
                },
              ],
            }),
          ]),
        }),
      );
    });

    it('should throw error when update fails', async () => {
      const updateError = new Error('Update failed');

      xeroClientService.post.mockRejectedValueOnce(updateError);

      await expect(
        service.updateContact(mockWorkspaceId, mockContactId, {
          email: 'new@example.com',
        }),
      ).rejects.toThrow();
    });

    it('should throw error when response contains no contacts', async () => {
      xeroClientService.post.mockResolvedValueOnce({ contacts: [] });

      await expect(
        service.updateContact(mockWorkspaceId, mockContactId, {
          email: 'new@example.com',
        }),
      ).rejects.toThrow('Xero API returned empty contacts array');
    });
  });

  describe('data mapping', () => {
    it('should map CRM data with all fields correctly', async () => {
      const fullContactData: CRMContactData = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        phone: '+61412345678',
        city: 'Brisbane',
        companyName: 'Tech Corp',
      };

      xeroClientService.get.mockResolvedValueOnce({ contacts: [] });
      xeroClientService.post.mockResolvedValueOnce({
        contacts: [mockXeroContact],
      });

      await service.findOrCreateContact(mockWorkspaceId, fullContactData);

      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        '/Contacts',
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              name: 'Tech Corp', // Company name takes priority
              firstName: 'Alice',
              lastName: 'Johnson',
              emailAddress: 'alice@example.com',
              isCustomer: true,
              phones: [
                {
                  phoneType: 'DEFAULT',
                  phoneNumber: '+61412345678',
                },
              ],
              addresses: [
                {
                  addressType: 'STREET',
                  city: 'Brisbane',
                },
              ],
            }),
          ]),
        }),
      );
    });

    it('should use email as name when no name or company provided', async () => {
      const emailOnlyData: CRMContactData = {
        email: 'contact@example.com',
      };

      xeroClientService.get.mockResolvedValueOnce({ contacts: [] });
      xeroClientService.post.mockResolvedValueOnce({
        contacts: [mockXeroContact],
      });

      await service.findOrCreateContact(mockWorkspaceId, emailOnlyData);

      expect(xeroClientService.post).toHaveBeenCalledWith(
        mockWorkspaceId,
        '/Contacts',
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              name: 'contact@example.com',
            }),
          ]),
        }),
      );
    });
  });
});
