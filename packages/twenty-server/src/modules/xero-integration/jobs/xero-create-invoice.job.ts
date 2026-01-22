import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import {
  OpportunityInvoiceData,
  XeroInvoiceService,
} from 'src/modules/xero-integration/services/xero-invoice.service';

/**
 * Job data for Xero invoice creation operations
 *
 * This processor handles creating invoices in Xero when opportunities
 * reach specific stages (engagement signed or exchanged).
 */
export interface XeroInvoiceJobData {
  workspaceId: string;
  opportunityId: string;
  invoiceType: 'engagement_fee' | 'success_fee';
  amount: number;
  buyerEmail: string;
  buyerFirstName: string;
  buyerLastName: string;
  propertyAddress: string;
}

/**
 * BullMQ job processor for asynchronous Xero invoice creation
 *
 * This processor handles creating invoices in Xero when opportunities reach specific stages:
 * - Engagement Fee: Created when opportunity stage changes to 'engagement_signed'
 * - Success Fee: Created when opportunity stage changes to 'exchanged'
 *
 * The processor:
 * - Receives job data from OpportunityStageChangedListener
 * - Maps opportunity data to Xero invoice format using XeroInvoiceService
 * - Creates the invoice in Xero via XeroInvoiceService
 * - Updates the opportunity record with the Xero invoice ID
 * - Handles errors gracefully with detailed logging
 * - Supports automatic retry through BullMQ's error handling (3 attempts, exponential backoff)
 *
 * Workflow:
 * 1. Load opportunity from database using Twenty ORM
 * 2. Validate opportunity exists and has required data
 * 3. Map opportunity data to Xero invoice format
 * 4. Create invoice in Xero via XeroInvoiceService
 * 5. Update opportunity with Xero invoice ID in custom field
 * 6. Log success or throw error for retry
 *
 * Error Handling:
 * - If opportunity not found: Log warning and exit gracefully
 * - If Xero connection not found: Throw error for retry
 * - If invoice creation fails: Throw error for retry (BullMQ will retry up to 3 times)
 * - If database update fails: Log error but consider invoice creation successful
 *
 * @see OpportunityStageChangedListener - Event listener that queues this job
 * @see XeroInvoiceService - Service that handles invoice creation in Xero
 */
@Processor(MessageQueue.xeroInvoiceQueue)
export class XeroCreateInvoiceJob {
  private readonly logger = new Logger(XeroCreateInvoiceJob.name);

  constructor(
    private readonly xeroInvoiceService: XeroInvoiceService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  /**
   * Main job handler for Xero invoice creation
   *
   * @param data - Job data containing opportunity details and invoice information
   * @throws Error if invoice creation fails (triggers BullMQ retry mechanism)
   */
  @Process(XeroCreateInvoiceJob.name)
  async handle(data: XeroInvoiceJobData): Promise<void> {
    const {
      workspaceId,
      opportunityId,
      invoiceType,
      amount,
      buyerEmail,
      buyerFirstName,
      buyerLastName,
      propertyAddress,
    } = data;

    this.logger.log(
      `Processing Xero invoice creation for opportunity ${opportunityId} (${invoiceType})`,
    );

    try {
      // Get repository for workspace-specific opportunity table
      const opportunityRepository =
        await this.globalWorkspaceOrmManager.getRepository<OpportunityWorkspaceEntity>(
          workspaceId,
          'opportunity',
        );

      // Load opportunity to verify it exists and get latest data
      const opportunity = await opportunityRepository.findOne({
        where: { id: opportunityId },
      });

      if (!opportunity) {
        this.logger.warn(
          `Opportunity ${opportunityId} not found in workspace ${workspaceId}. Skipping invoice creation.`,
        );

        return;
      }

      // Prepare opportunity data for invoice mapping
      const opportunityInvoiceData: OpportunityInvoiceData = {
        buyerEmail,
        buyerFirstName,
        buyerLastName,
        propertyAddress,
        invoiceType,
        amount,
        opportunityId,
      };

      // Map opportunity to Xero invoice format
      const xeroInvoiceData =
        this.xeroInvoiceService.mapOpportunityToInvoice(
          workspaceId,
          opportunityInvoiceData,
        );

      this.logger.log(
        `Creating ${invoiceType} invoice in Xero for $${amount} - ${buyerEmail}`,
      );

      // Create invoice in Xero
      const createdInvoice = await this.xeroInvoiceService.createInvoice(
        workspaceId,
        xeroInvoiceData,
      );

      this.logger.log(
        `Successfully created Xero invoice ${createdInvoice.invoiceID} (${createdInvoice.invoiceNumber}) for opportunity ${opportunityId}`,
      );

      // Update opportunity with Xero invoice ID
      // Note: This assumes a custom field 'xeroInvoiceId' exists on the opportunity
      // In a real implementation, you might need to:
      // 1. Create this field via the metadata API if it doesn't exist
      // 2. Or store it in a separate XeroInvoice tracking table
      // 3. Or use the reference field that links to a custom XeroInvoice object
      try {
        await opportunityRepository.update(opportunityId, {
          // Store invoice ID in a custom field (to be created via metadata)
          // This is a placeholder - actual field name may vary
          ...(invoiceType === 'engagement_fee'
            ? { xeroEngagementInvoiceId: createdInvoice.invoiceID }
            : { xeroSuccessFeeInvoiceId: createdInvoice.invoiceID }),
        } as any);

        this.logger.log(
          `Updated opportunity ${opportunityId} with Xero invoice ID ${createdInvoice.invoiceID}`,
        );
      } catch (updateError) {
        // Log the error but don't fail the job since the invoice was created successfully
        // The invoice ID can be retrieved from Xero if needed
        this.logger.error(
          `Failed to update opportunity ${opportunityId} with invoice ID: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
          updateError instanceof Error ? updateError.stack : undefined,
        );
        // Continue - invoice was created successfully in Xero
      }

      this.logger.log(
        `Completed Xero invoice creation job for opportunity ${opportunityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Xero invoice creation failed for opportunity ${opportunityId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw to trigger BullMQ retry mechanism
      // BullMQ will automatically retry with exponential backoff (default: 3 attempts)
      throw error;
    }
  }
}
