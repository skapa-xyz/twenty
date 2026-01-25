import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { XeroConnectionEntity } from 'src/modules/xero-integration/entities/xero-connection.entity';
import { XeroClientService } from 'src/modules/xero-integration/services/xero-client.service';

/**
 * Represents a webhook event from Xero
 */
export interface XeroWebhookEvent {
  resourceUrl: string;
  resourceId: string;
  tenantId: string;
  tenantType: string;
  eventCategory: string;
  eventType: string;
  eventDateUtc: string;
}

/**
 * Service for processing Xero webhook events
 *
 * This service handles incoming webhook events from Xero and updates
 * the CRM records accordingly. It processes:
 * - INVOICE.CREATED: Logs new invoices created in Xero
 * - INVOICE.UPDATED: Updates opportunity stage based on invoice status
 * - CONTACT.UPDATED: Syncs contact changes from Xero to CRM
 *
 * The service uses the tenant ID from the webhook to identify the
 * workspace connection and performs updates in that workspace context.
 */
@Injectable()
export class XeroWebhookService {
  private readonly logger = new Logger(XeroWebhookService.name);

  constructor(
    @InjectRepository(XeroConnectionEntity)
    private readonly xeroConnectionRepository: Repository<XeroConnectionEntity>,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly xeroClientService: XeroClientService,
  ) {}

  /**
   * Process a single webhook event from Xero
   *
   * This is the main entry point for webhook event processing.
   * It routes events to specific handlers based on event type.
   *
   * @param event - The webhook event to process
   */
  async processEvent(event: XeroWebhookEvent): Promise<void> {
    this.logger.log(
      `Processing Xero webhook event: ${event.eventCategory}.${event.eventType} for tenant ${event.tenantId}`,
    );

    // Find the workspace connection for this Xero tenant
    const connection = await this.xeroConnectionRepository.findOne({
      where: { tenantId: event.tenantId, isActive: true },
    });

    if (!connection) {
      this.logger.warn(
        `No active Xero connection found for tenant ${event.tenantId}`,
      );

      return;
    }

    try {
      // Route to appropriate handler based on event type
      const eventKey = `${event.eventCategory}.${event.eventType}`;

      switch (eventKey) {
        case 'INVOICE.CREATE':
        case 'INVOICE.CREATED':
          await this.handleInvoiceCreated(event, connection.workspaceId);
          break;

        case 'INVOICE.UPDATE':
        case 'INVOICE.UPDATED':
          await this.handleInvoiceUpdated(event, connection.workspaceId);
          break;

        case 'CONTACT.UPDATE':
        case 'CONTACT.UPDATED':
          await this.handleContactUpdated(event, connection.workspaceId);
          break;

        default:
          this.logger.debug(`Unhandled event type: ${eventKey} - ignoring`);
      }

      // Update last sync timestamp
      await this.xeroConnectionRepository.update(connection.id, {
        lastSyncAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Error processing webhook event ${event.eventType}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle INVOICE.CREATED event
   *
   * When a new invoice is created in Xero, we log the event for debugging
   * and tracking purposes. In future iterations, this could trigger
   * notifications or update opportunity records.
   *
   * @param event - The webhook event
   * @param workspaceId - The workspace ID associated with the Xero connection
   */
  private async handleInvoiceCreated(
    event: XeroWebhookEvent,
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `Invoice created in Xero: ${event.resourceId} (workspace: ${workspaceId})`,
    );

    // Log the event for debugging and audit trail
    this.logger.debug({
      event: 'invoice.created',
      invoiceId: event.resourceId,
      resourceUrl: event.resourceUrl,
      tenantId: event.tenantId,
      workspaceId,
      timestamp: event.eventDateUtc,
    });

    // TODO: Future enhancements could include:
    // 1. Fetch invoice details from Xero API using XeroClientService
    // 2. Create/update opportunity based on invoice data
    // 3. Send notification to workspace members
    // 4. Update financial dashboards
    // 5. Queue background job for heavy processing
  }

  /**
   * Handle INVOICE.UPDATED event
   *
   * When an invoice is updated in Xero (e.g., payment received, status changed),
   * we fetch the updated invoice data and attempt to find the corresponding
   * opportunity in the CRM to update it accordingly.
   *
   * This is particularly useful for tracking when invoices are paid, which
   * can automatically move opportunities to a "paid" stage.
   *
   * @param event - The webhook event
   * @param workspaceId - The workspace ID associated with the Xero connection
   */
  private async handleInvoiceUpdated(
    event: XeroWebhookEvent,
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `Invoice updated in Xero: ${event.resourceId} (workspace: ${workspaceId})`,
    );

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      authContext,
      async () => {
        try {
          // Fetch the invoice details from Xero API to get current status
          const invoiceResponse = await this.xeroClientService.get<{
            Invoices: Array<{
              InvoiceID: string;
              Status: string;
              Total: number;
              AmountPaid: number;
              AmountDue: number;
              Reference?: string;
            }>;
          }>(workspaceId, `/Invoices/${event.resourceId}`);

          if (
            !invoiceResponse?.Invoices ||
            invoiceResponse.Invoices.length === 0
          ) {
            this.logger.warn(
              `Invoice ${event.resourceId} not found in Xero API response`,
            );

            return;
          }

          const invoice = invoiceResponse.Invoices[0];
          const invoiceStatus = invoice.Status;

          this.logger.debug({
            event: 'invoice.updated',
            invoiceId: event.resourceId,
            status: invoiceStatus,
            reference: invoice.Reference,
            total: invoice.Total,
            amountPaid: invoice.AmountPaid,
            amountDue: invoice.AmountDue,
            tenantId: event.tenantId,
            workspaceId,
            timestamp: event.eventDateUtc,
          });

          // Get opportunity repository (unused - prepared for future enhancement)
          const _opportunityRepository =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              OpportunityWorkspaceEntity,
              {
                shouldBypassPermissionChecks: true,
              },
            );

          // TODO: Future enhancement - Link invoices to opportunities
          // This would require:
          // 1. A mapping table or custom field to link Xero invoice IDs to opportunities
          // 2. Logic to update opportunity stage based on invoice status:
          //    - PAID -> Move to "invoice_paid" stage
          //    - VOIDED -> Handle accordingly (possibly move back or flag)
          //    - AUTHORISED -> Ensure opportunity is in "invoiced" stage
          //
          // Example implementation:
          // const reference = invoice.Reference; // e.g., "OPP-{opportunityId}"
          // if (reference?.startsWith('OPP-')) {
          //   const opportunityId = reference.replace('OPP-', '');
          //   const opportunity = await opportunityRepository.findOne({
          //     where: { id: opportunityId }
          //   });
          //   if (opportunity && invoiceStatus === 'PAID') {
          //     await opportunityRepository.update(opportunity.id, {
          //       stage: 'invoice_paid'
          //     });
          //     this.logger.log(
          //       `Updated opportunity ${opportunityId} to invoice_paid stage`
          //     );
          //   }
          // }

          this.logger.log(
            `Processed invoice update for ${event.resourceId} with status ${invoiceStatus}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process invoice update for ${event.resourceId}: ${error.message}`,
            error.stack,
          );
          // Re-throw to allow upper-level error handling
          throw error;
        }
      },
    );
  }

  /**
   * Handle CONTACT.UPDATED event
   *
   * When a contact is updated in Xero, we fetch the updated contact data
   * and sync those changes back to the CRM. This ensures that contact
   * information remains consistent across both systems.
   *
   * We attempt to match Xero contacts to CRM persons/companies by email
   * or name, and update their information accordingly.
   *
   * @param event - The webhook event
   * @param workspaceId - The workspace ID associated with the Xero connection
   */
  private async handleContactUpdated(
    event: XeroWebhookEvent,
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `Contact updated in Xero: ${event.resourceId} (workspace: ${workspaceId})`,
    );

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      authContext,
      async () => {
        try {
          // Fetch the contact details from Xero API
          const contactResponse = await this.xeroClientService.get<{
            Contacts: Array<{
              ContactID: string;
              Name: string;
              EmailAddress?: string;
              IsCustomer?: boolean;
              IsSupplier?: boolean;
            }>;
          }>(workspaceId, `/Contacts/${event.resourceId}`);

          if (
            !contactResponse?.Contacts ||
            contactResponse.Contacts.length === 0
          ) {
            this.logger.warn(
              `Contact ${event.resourceId} not found in Xero API response`,
            );

            return;
          }

          const xeroContact = contactResponse.Contacts[0];
          const isCompany =
            xeroContact.IsCustomer === true || xeroContact.IsSupplier === true;

          this.logger.debug({
            event: 'contact.updated',
            contactId: event.resourceId,
            name: xeroContact.Name,
            email: xeroContact.EmailAddress,
            isCompany,
            tenantId: event.tenantId,
            workspaceId,
            timestamp: event.eventDateUtc,
          });

          // Get repositories for both persons and companies (unused - prepared for future enhancement)
          const _personRepository =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              PersonWorkspaceEntity,
              {
                shouldBypassPermissionChecks: true,
              },
            );

          const _companyRepository =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              CompanyWorkspaceEntity,
              {
                shouldBypassPermissionChecks: true,
              },
            );

          // TODO: Future enhancement - Sync contact updates to CRM
          // This would require:
          // 1. A mapping table or custom field to link Xero contact IDs to Person/Company records
          // 2. Logic to determine if contact is a person or company
          // 3. Update the CRM record with new information from Xero:
          //    - Name changes
          //    - Email updates
          //    - Phone number changes
          //    - Address updates
          //
          // Example implementation for person:
          // if (xeroContact.EmailAddress) {
          //   const person = await personRepository.findOne({
          //     where: { email: { primaryEmail: xeroContact.EmailAddress } }
          //   });
          //   if (person) {
          //     await personRepository.update(person.id, {
          //       name: {
          //         firstName: xeroContact.FirstName || '',
          //         lastName: xeroContact.LastName || ''
          //       },
          //       phone: {
          //         primaryPhoneNumber: xeroContact.Phones?.[0]?.PhoneNumber || null
          //       }
          //     });
          //     this.logger.log(
          //       `Updated person ${person.id} from Xero contact ${event.resourceId}`
          //     );
          //   }
          // }

          this.logger.log(
            `Processed contact update for ${event.resourceId} (${xeroContact.Name})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process contact update for ${event.resourceId}: ${error.message}`,
            error.stack,
          );
          // Re-throw to allow upper-level error handling
          throw error;
        }
      },
    );
  }
}
