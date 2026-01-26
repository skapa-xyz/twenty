import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { FormsLiveFormService } from 'src/modules/formslive-integration/services/formslive-form.service';
import { FormsLiveSigningService } from 'src/modules/formslive-integration/services/formslive-signing.service';
import { AustralianState } from 'src/modules/formslive-integration/entities/formslive-connection.entity';
import {
  BuyerData,
  AgentData,
} from 'src/modules/formslive-integration/types/formslive.types';

/**
 * Job data for FormsLive form creation operations.
 *
 * This job is queued by the EngagementStageListener when an opportunity
 * moves to the 'engagement' stage.
 */
export type FormsLiveCreateFormJobData = {
  workspaceId: string;
  userId: string;
  opportunityId: string;
  buyerId: string;
  australianState: AustralianState;
  buyerData: BuyerData;
  agentData: AgentData;
  initiateRemoteSigning: boolean;
};

/**
 * BullMQ job processor for FormsLive form creation.
 *
 * This processor handles the complete engagement agreement workflow:
 * 1. Creates a form from the user's selected template
 * 2. Populates the form with Buyer and Agent data
 * 3. Stores the form ID on the Opportunity for tracking
 * 4. Optionally initiates remote signing
 *
 * Error handling:
 * - If form creation fails: Throw error for retry
 * - If signing initiation fails: Log but don't fail (form was created)
 * - If database update fails: Log but don't fail
 *
 * @see EngagementStageListener - Event listener that queues this job
 * @see FormsLiveFormService - Service that handles form creation
 * @see FormsLiveSigningService - Service that handles signing
 */
@Processor(MessageQueue.formsLiveQueue)
export class FormsLiveCreateFormJob {
  private readonly logger = new Logger(FormsLiveCreateFormJob.name);

  constructor(
    private readonly formService: FormsLiveFormService,
    private readonly signingService: FormsLiveSigningService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  /**
   * Main job handler for FormsLive form creation.
   *
   * @param data - Job data containing opportunity and buyer details
   * @throws Error if form creation fails (triggers BullMQ retry mechanism)
   */
  @Process(FormsLiveCreateFormJob.name)
  async handle(data: FormsLiveCreateFormJobData): Promise<void> {
    const {
      workspaceId,
      userId,
      opportunityId,
      buyerData,
      agentData,
      initiateRemoteSigning,
    } = data;

    this.logger.log(
      `Processing FormsLive form creation for opportunity ${opportunityId}`,
    );

    try {
      // Create the engagement form (includes field population)
      const form = await this.formService.createEngagementForm(
        userId,
        workspaceId,
        opportunityId,
        buyerData,
        agentData,
      );

      this.logger.log(
        `Created FormsLive form ${form.id} for opportunity ${opportunityId}`,
      );

      // Update opportunity with form ID
      try {
        const opportunityRepository =
          await this.globalWorkspaceOrmManager.getRepository<OpportunityWorkspaceEntity>(
            workspaceId,
            'opportunity',
          );

        await opportunityRepository.update(opportunityId, {
          formsLiveFormId: String(form.id),
          formsLiveSigningStatus: 'pending',
        } as Partial<OpportunityWorkspaceEntity>);

        this.logger.log(
          `Updated opportunity ${opportunityId} with FormsLive form ID ${form.id}`,
        );
      } catch (updateError) {
        // Log but don't fail - form was created successfully
        this.logger.error(
          `Failed to update opportunity with form ID: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
        );
      }

      // Initiate remote signing if requested
      if (initiateRemoteSigning) {
        try {
          await this.signingService.initiateRemoteSigning(
            userId,
            workspaceId,
            form.id,
            buyerData,
            agentData,
            'Please review and sign your Buyers Agent Engagement Agreement.',
            'Buyers Agent Engagement Agreement - Please Sign',
          );

          this.logger.log(`Initiated remote signing for form ${form.id}`);

          // Update signing status
          try {
            const opportunityRepository =
              await this.globalWorkspaceOrmManager.getRepository<OpportunityWorkspaceEntity>(
                workspaceId,
                'opportunity',
              );

            await opportunityRepository.update(opportunityId, {
              formsLiveSigningStatus: 'sent',
            } as Partial<OpportunityWorkspaceEntity>);
          } catch (statusError) {
            this.logger.error(
              `Failed to update signing status: ${statusError instanceof Error ? statusError.message : String(statusError)}`,
            );
          }
        } catch (signingError) {
          // Log but don't fail - form was created, signing can be initiated manually
          this.logger.error(
            `Failed to initiate remote signing: ${signingError instanceof Error ? signingError.message : String(signingError)}`,
          );
        }
      }

      this.logger.log(
        `Completed FormsLive form creation job for opportunity ${opportunityId}`,
      );
    } catch (error) {
      this.logger.error(
        `FormsLive form creation failed for opportunity ${opportunityId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw to trigger BullMQ retry mechanism
      throw error;
    }
  }
}
