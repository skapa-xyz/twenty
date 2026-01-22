import { Injectable, Logger } from '@nestjs/common';
import { CustomError } from 'twenty-shared/utils';

import { XeroClientService } from 'src/modules/xero-integration/services/xero-client.service';
import type {
  CRMContactData,
  CreateXeroContactInput,
  UpdateXeroContactInput,
  XeroContact,
  XeroContactResponse,
  XeroPhone,
  XeroAddress,
} from 'src/modules/xero-integration/types/xero-contact.types';

export enum XeroContactServiceExceptionCode {
  CONTACT_NOT_FOUND = 'XERO_CONTACT_NOT_FOUND',
  CONTACT_CREATE_FAILED = 'XERO_CONTACT_CREATE_FAILED',
  CONTACT_UPDATE_FAILED = 'XERO_CONTACT_UPDATE_FAILED',
  DUPLICATE_CONTACT = 'XERO_DUPLICATE_CONTACT',
  INVALID_CONTACT_DATA = 'XERO_INVALID_CONTACT_DATA',
}

/**
 * XeroContactService - Service for managing Xero contacts
 *
 * Handles bidirectional contact synchronization between the CRM and Xero.
 * Provides methods to find, create, and update contacts in Xero with
 * duplicate detection and data mapping from CRM entities.
 *
 * Usage:
 * ```typescript
 * // Find or create a contact by email
 * const contact = await xeroContactService.findOrCreateContact(
 *   workspaceId,
 *   { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
 * );
 *
 * // Get a specific contact
 * const contact = await xeroContactService.getContact(workspaceId, contactId);
 *
 * // Update a contact
 * const updated = await xeroContactService.updateContact(
 *   workspaceId,
 *   contactId,
 *   { phone: '+61412345678' }
 * );
 * ```
 */
@Injectable()
export class XeroContactService {
  private readonly logger = new Logger(XeroContactService.name);

  constructor(private readonly xeroClient: XeroClientService) {}

  /**
   * Find a contact by email, or create if not found
   *
   * This method searches Xero for a contact with the given email address.
   * If found, returns the existing contact. If not found, creates a new
   * contact with the provided data.
   *
   * @param workspaceId - The workspace ID
   * @param contactData - CRM contact data to sync
   * @returns The found or created Xero contact
   */
  async findOrCreateContact(
    workspaceId: string,
    contactData: CRMContactData,
  ): Promise<XeroContact> {
    this.logger.log(
      `Finding or creating Xero contact for workspace ${workspaceId}`,
    );

    // Validate that we have at least a name or email
    if (!contactData.email && !contactData.firstName && !contactData.lastName && !contactData.companyName) {
      throw new CustomError(
        'Contact data must include at least an email, name, or company name',
        XeroContactServiceExceptionCode.INVALID_CONTACT_DATA,
      );
    }

    try {
      // Try to find existing contact by email first
      if (contactData.email) {
        const existingContact = await this.findContactByEmail(
          workspaceId,
          contactData.email,
        );

        if (existingContact) {
          this.logger.log(
            `Found existing Xero contact: ${existingContact.contactID}`,
          );
          return existingContact;
        }
      }

      // If not found by email, create new contact
      this.logger.log('Contact not found, creating new Xero contact');
      return await this.createContact(workspaceId, contactData);
    } catch (error) {
      this.logger.error(
        `Failed to find or create Xero contact: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a specific contact by ID
   *
   * @param workspaceId - The workspace ID
   * @param contactId - The Xero contact ID
   * @returns The Xero contact, or null if not found
   */
  async getContact(
    workspaceId: string,
    contactId: string,
  ): Promise<XeroContact | null> {
    this.logger.log(
      `Fetching Xero contact ${contactId} for workspace ${workspaceId}`,
    );

    try {
      const response = await this.xeroClient.get<XeroContactResponse>(
        workspaceId,
        `/Contacts/${contactId}`,
      );

      if (response.contacts && response.contacts.length > 0) {
        return response.contacts[0];
      }

      return null;
    } catch (error) {
      // If 404, contact doesn't exist - return null
      if (error.response?.status === 404) {
        this.logger.log(`Xero contact ${contactId} not found`);
        return null;
      }

      this.logger.error(
        `Failed to get Xero contact ${contactId}: ${error.message}`,
        error.stack,
      );
      throw new CustomError(
        `Failed to get Xero contact: ${error.message}`,
        XeroContactServiceExceptionCode.CONTACT_NOT_FOUND,
      );
    }
  }

  /**
   * Update an existing contact in Xero
   *
   * @param workspaceId - The workspace ID
   * @param contactId - The Xero contact ID
   * @param updates - The contact data to update
   * @returns The updated Xero contact
   */
  async updateContact(
    workspaceId: string,
    contactId: string,
    updates: CRMContactData,
  ): Promise<XeroContact> {
    this.logger.log(
      `Updating Xero contact ${contactId} for workspace ${workspaceId}`,
    );

    try {
      const updateData = this.mapCRMDataToXeroUpdate(updates);

      const response = await this.xeroClient.post<XeroContactResponse>(
        workspaceId,
        `/Contacts/${contactId}`,
        {
          Contacts: [
            {
              ContactID: contactId,
              ...updateData,
            },
          ],
        },
      );

      if (response.contacts && response.contacts.length > 0) {
        this.logger.log(`Successfully updated Xero contact ${contactId}`);
        return response.contacts[0];
      }

      throw new CustomError(
        'Xero API returned empty contacts array',
        XeroContactServiceExceptionCode.CONTACT_UPDATE_FAILED,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update Xero contact ${contactId}: ${error.message}`,
        error.stack,
      );
      throw new CustomError(
        `Failed to update Xero contact: ${error.message}`,
        XeroContactServiceExceptionCode.CONTACT_UPDATE_FAILED,
      );
    }
  }

  /**
   * Find a contact by email address
   *
   * @param workspaceId - The workspace ID
   * @param email - The email address to search for
   * @returns The found contact, or null if not found
   */
  private async findContactByEmail(
    workspaceId: string,
    email: string,
  ): Promise<XeroContact | null> {
    try {
      // Search for contacts by email using Xero's where parameter
      // EmailAddress filter is case-insensitive in Xero API
      const whereClause = `EmailAddress=="${email}"`;

      const response = await this.xeroClient.get<XeroContactResponse>(
        workspaceId,
        '/Contacts',
        {
          params: {
            where: whereClause,
          },
        },
      );

      if (response.contacts && response.contacts.length > 0) {
        // Return the first match
        return response.contacts[0];
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to search Xero contacts by email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new contact in Xero
   *
   * @param workspaceId - The workspace ID
   * @param contactData - CRM contact data
   * @returns The created Xero contact
   */
  private async createContact(
    workspaceId: string,
    contactData: CRMContactData,
  ): Promise<XeroContact> {
    try {
      const createData = this.mapCRMDataToXeroCreate(contactData);

      this.logger.debug(
        `Creating Xero contact with data: ${JSON.stringify(createData)}`,
      );

      const response = await this.xeroClient.post<XeroContactResponse>(
        workspaceId,
        '/Contacts',
        {
          Contacts: [createData],
        },
      );

      if (response.contacts && response.contacts.length > 0) {
        const createdContact = response.contacts[0];
        this.logger.log(
          `Successfully created Xero contact: ${createdContact.contactID}`,
        );
        return createdContact;
      }

      throw new CustomError(
        'Xero API returned empty contacts array',
        XeroContactServiceExceptionCode.CONTACT_CREATE_FAILED,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create Xero contact: ${error.message}`,
        error.stack,
      );
      throw new CustomError(
        `Failed to create Xero contact: ${error.message}`,
        XeroContactServiceExceptionCode.CONTACT_CREATE_FAILED,
      );
    }
  }

  /**
   * Map CRM contact data to Xero contact creation format
   *
   * @param contactData - CRM contact data
   * @returns Xero contact creation input
   */
  private mapCRMDataToXeroCreate(
    contactData: CRMContactData,
  ): CreateXeroContactInput {
    // Determine the contact name
    // Priority: Company name > Full name > Email
    let name: string;
    if (contactData.companyName) {
      name = contactData.companyName;
    } else if (contactData.firstName || contactData.lastName) {
      const firstName = contactData.firstName || '';
      const lastName = contactData.lastName || '';
      name = `${firstName} ${lastName}`.trim();
    } else if (contactData.email) {
      name = contactData.email;
    } else {
      name = 'Unknown Contact';
    }

    const xeroContact: CreateXeroContactInput = {
      name,
      firstName: contactData.firstName || undefined,
      lastName: contactData.lastName || undefined,
      emailAddress: contactData.email || undefined,
      isCustomer: true, // Mark as customer by default
    };

    // Add phone if available
    if (contactData.phone) {
      xeroContact.phones = [
        {
          phoneType: 'DEFAULT',
          phoneNumber: contactData.phone,
        },
      ];
    }

    // Add address if city is available
    if (contactData.city) {
      xeroContact.addresses = [
        {
          addressType: 'STREET',
          city: contactData.city,
        },
      ];
    }

    return xeroContact;
  }

  /**
   * Map CRM contact data to Xero contact update format
   *
   * @param contactData - CRM contact data
   * @returns Xero contact update input
   */
  private mapCRMDataToXeroUpdate(
    contactData: CRMContactData,
  ): UpdateXeroContactInput {
    const updates: UpdateXeroContactInput = {};

    // Update name if we have first or last name
    if (contactData.firstName || contactData.lastName) {
      const firstName = contactData.firstName || '';
      const lastName = contactData.lastName || '';
      updates.name = `${firstName} ${lastName}`.trim();
      updates.firstName = contactData.firstName || undefined;
      updates.lastName = contactData.lastName || undefined;
    }

    // Update email
    if (contactData.email) {
      updates.emailAddress = contactData.email;
    }

    // Update phone
    if (contactData.phone) {
      updates.phones = [
        {
          phoneType: 'DEFAULT',
          phoneNumber: contactData.phone,
        },
      ];
    }

    // Update address
    if (contactData.city) {
      updates.addresses = [
        {
          addressType: 'STREET',
          city: contactData.city,
        },
      ];
    }

    return updates;
  }
}
