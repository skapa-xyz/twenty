import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { FormsLiveConnectionEntity } from 'src/modules/formslive-integration/entities/formslive-connection.entity';
import { FormsLiveWebhookPayload } from 'src/modules/formslive-integration/types/formslive.types';

/**
 * Service for processing FormsLive webhook events.
 *
 * FormsLive sends webhooks for various form events:
 * - form.create: Form created
 * - form.update: Form updated
 * - form.sign: Form signed (in-person)
 * - form.remotesign: Remote signing status changed
 * - form.finalise: Form finalized (all signatures complete)
 *
 * This service processes these events and updates the corresponding
 * records in the CRM (Opportunity, Buyer).
 *
 * @example
 * ```typescript
 * // Process a webhook event
 * await webhookService.processEvent({
 *   id: 'evt_123',
 *   type: 'form.finalise',
 *   payload: { id: 12345, name: 'Engagement Agreement', ... }
 * });
 * ```
 */
@Injectable()
export class FormsLiveWebhookService {
  private readonly logger = new Logger(FormsLiveWebhookService.name);

  constructor(
    @InjectRepository(FormsLiveConnectionEntity)
    private readonly connectionRepository: Repository<FormsLiveConnectionEntity>,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  /**
   * Processes a FormsLive webhook event.
   *
   * Routes the event to the appropriate handler based on event type.
   *
   * @param event - The webhook event payload
   */
  async processEvent(event: FormsLiveWebhookPayload): Promise<void> {
    this.logger.log(
      `Processing FormsLive webhook: ${event.type} for form ${event.payload.id}`,
    );

    switch (event.type) {
      case 'form.finalise':
        await this.handleFormFinalise(event);
        break;

      case 'form.remotesign':
        await this.handleRemoteSign(event);
        break;

      case 'form.sign':
        await this.handleFormSign(event);
        break;

      case 'form.create':
      case 'form.update':
        // These events are informational only
        this.logger.debug(
          `Received ${event.type} event for form ${event.payload.id}`,
        );
        break;

      default:
        this.logger.warn(`Unknown webhook event type: ${event.type}`);
    }
  }

  /**
   * Handles form.finalise event - all signatures complete.
   *
   * When an engagement agreement is finalized:
   * 1. Find the opportunity with this form ID
   * 2. Update the Buyer's engagementSignedDate
   * 3. Update the opportunity's signing status
   *
   * @param event - The webhook event
   */
  private async handleFormFinalise(
    event: FormsLiveWebhookPayload,
  ): Promise<void> {
    const formId = event.payload.id;
    const userId = event.payload.user_id;

    this.logger.log(`Form ${formId} finalized by user ${userId}`);

    // Find the connection to get workspace context
    const connection = await this.connectionRepository.findOne({
      where: { formsLiveUserId: String(userId), isActive: true },
    });

    if (!connection) {
      this.logger.warn(
        `No active FormsLive connection found for user ${userId}. Cannot update CRM records.`,
      );

      return;
    }

    try {
      // Find and update the opportunity with this form ID
      const opportunityRepository =
        await this.globalWorkspaceOrmManager.getRepository(
          connection.workspaceId,
          'opportunity',
        );

      // Find opportunity by FormsLive form ID
      // Note: This assumes a custom field 'formsLiveFormId' exists on opportunity
      const opportunity = await opportunityRepository.findOne({
        where: { formsLiveFormId: String(formId) },
      });

      if (!opportunity) {
        this.logger.warn(`No opportunity found with formsLiveFormId=${formId}`);

        return;
      }

      // Update opportunity signing status
      await opportunityRepository.update(opportunity.id, {
        formsLiveSigningStatus: 'completed',
      });

      // Update Buyer's engagement signed date
      if (opportunity.buyerId) {
        const buyerRepository =
          await this.globalWorkspaceOrmManager.getRepository(
            connection.workspaceId,
            'buyer',
          );

        await buyerRepository.update(opportunity.buyerId, {
          engagementSignedDate: new Date(),
        });

        this.logger.log(
          `Updated Buyer ${opportunity.buyerId} with engagementSignedDate`,
        );
      }

      this.logger.log(
        `Successfully processed form.finalise for opportunity ${opportunity.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process form.finalise webhook: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Handles form.remotesign event - remote signing status changed.
   *
   * Updates the opportunity's signing status as signers interact with the document.
   *
   * @param event - The webhook event
   */
  private async handleRemoteSign(
    event: FormsLiveWebhookPayload,
  ): Promise<void> {
    const formId = event.payload.id;
    const userId = event.payload.user_id;

    this.logger.log(`Remote signing event for form ${formId}`);

    // Find the connection to get workspace context
    const connection = await this.connectionRepository.findOne({
      where: { formsLiveUserId: String(userId), isActive: true },
    });

    if (!connection) {
      this.logger.warn(
        `No active FormsLive connection found for user ${userId}`,
      );

      return;
    }

    try {
      const opportunityRepository =
        await this.globalWorkspaceOrmManager.getRepository(
          connection.workspaceId,
          'opportunity',
        );

      // Update opportunity to reflect signing is in progress
      await opportunityRepository.update(
        { formsLiveFormId: String(formId) },
        { formsLiveSigningStatus: 'sent' },
      );

      this.logger.log(`Updated signing status to 'sent' for form ${formId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process form.remotesign webhook: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handles form.sign event - in-person signing occurred.
   *
   * @param event - The webhook event
   */
  private async handleFormSign(event: FormsLiveWebhookPayload): Promise<void> {
    const formId = event.payload.id;

    this.logger.log(`In-person signing event for form ${formId}`);

    // Similar logic to handleRemoteSign
    // In-person signing may not require the same status updates
  }

  /**
   * Finds the workspace ID for a FormsLive user ID.
   *
   * @param formsLiveUserId - The FormsLive user ID from the webhook
   * @returns The workspace ID if found
   */
  async findWorkspaceByFormsLiveUserId(
    formsLiveUserId: string,
  ): Promise<string | null> {
    const connection = await this.connectionRepository.findOne({
      where: { formsLiveUserId, isActive: true },
    });

    return connection?.workspaceId ?? null;
  }
}
