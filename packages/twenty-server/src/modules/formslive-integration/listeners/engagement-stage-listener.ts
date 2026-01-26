import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { FormsLiveTokenService } from 'src/modules/formslive-integration/services/formslive-token.service';
import {
  FormsLiveCreateFormJob,
  FormsLiveCreateFormJobData,
} from 'src/modules/formslive-integration/jobs/formslive-create-form.job';

/**
 * Event payload for opportunity stage changes.
 *
 * This matches the event structure from the opportunity workflow.
 * The event is emitted when an opportunity's stage field is updated.
 */
export type OpportunityStageChangedEvent = {
  workspaceId: string;
  opportunityId: string;
  previousStage: string;
  currentStage: string;
  userId: string;
  opportunityData: {
    buyerId: string;
    buyerName: string;
    buyerEmail?: string;
    buyerPhone?: string;
    engagementFee?: number;
    commissionRate?: number;
    solicitorName?: string;
    solicitorContact?: string;
    mortgageBrokerName?: string;
    mortgageBrokerContact?: string;
  };
  agentData: {
    displayName: string;
    email?: string;
    phone?: string;
  };
};

/**
 * Event listener for FormsLive engagement automation.
 *
 * This listener monitors opportunity stage changes and triggers FormsLive
 * form creation when an opportunity moves to the "engagement" stage.
 *
 * The listener:
 * 1. Filters for transitions TO the engagement stage
 * 2. Checks if the user has FormsLive configured with a template
 * 3. Queues a job to create and populate the engagement form
 * 4. The job handles form creation, population, and signing initiation
 *
 * Note: This listener is independent of the Xero listener. Both can be
 * triggered on the same stage change - Xero creates the invoice, FormsLive
 * creates the engagement agreement.
 *
 * @example
 * Event flow:
 * 1. User moves opportunity to "engagement" stage
 * 2. OpportunityStageChangedEvent is emitted
 * 3. This listener receives the event
 * 4. FormsLiveCreateFormJob is queued
 * 5. Job creates form, populates fields, initiates signing
 * 6. Webhooks notify of signing completion
 */
@Injectable()
export class EngagementStageListener {
  private readonly logger = new Logger(EngagementStageListener.name);

  constructor(
    @InjectMessageQueue(MessageQueue.formsLiveQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly tokenService: FormsLiveTokenService,
  ) {}

  /**
   * Handles opportunity stage change events.
   *
   * Triggers FormsLive form creation when transitioning to 'engagement' stage.
   *
   * @param event - The stage change event with opportunity and buyer data
   */
  @OnEvent('opportunity.stageChanged')
  async handleStageChange(event: OpportunityStageChangedEvent): Promise<void> {
    const {
      workspaceId,
      opportunityId,
      previousStage,
      currentStage,
      userId,
      opportunityData,
      agentData,
    } = event;

    // Only trigger on transition TO engagement stage
    if (currentStage !== 'engagement' || previousStage === 'engagement') {
      return;
    }

    this.logger.log(
      `Opportunity ${opportunityId} moved to engagement stage. Checking FormsLive configuration...`,
    );

    // Check if FormsLive is configured for this user
    const connection = await this.tokenService.getConnection(
      userId,
      workspaceId,
    );

    if (!connection?.isActive) {
      this.logger.log(
        `FormsLive not configured for user ${userId}. Skipping form creation.`,
      );

      return;
    }

    if (!connection.engagementTemplateId) {
      this.logger.log(
        `No engagement template selected for user ${userId}. Skipping form creation.`,
      );

      return;
    }

    // Validate that we have minimum required data
    if (!opportunityData.buyerEmail) {
      this.logger.warn(
        `Buyer email missing for opportunity ${opportunityId}. Remote signing requires email.`,
      );
      // Continue anyway - form can be created, just won't have signing
    }

    // Queue the form creation job
    await this.messageQueueService.add<FormsLiveCreateFormJobData>(
      FormsLiveCreateFormJob.name,
      {
        workspaceId,
        userId,
        opportunityId,
        buyerId: opportunityData.buyerId,
        australianState: connection.australianState,
        buyerData: {
          name: opportunityData.buyerName,
          email: opportunityData.buyerEmail,
          phone: opportunityData.buyerPhone,
          engagementFee: opportunityData.engagementFee,
          commissionRate: opportunityData.commissionRate,
          solicitorName: opportunityData.solicitorName,
          solicitorContact: opportunityData.solicitorContact,
          mortgageBrokerName: opportunityData.mortgageBrokerName,
          mortgageBrokerContact: opportunityData.mortgageBrokerContact,
        },
        agentData,
        initiateRemoteSigning: !!opportunityData.buyerEmail,
      },
      {
        retryLimit: 3,
      },
    );

    this.logger.log(
      `Queued FormsLive form creation for opportunity ${opportunityId}`,
    );
  }
}
