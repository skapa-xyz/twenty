import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';

import {
  XeroCreateInvoiceJob,
  XeroInvoiceJobData,
} from '../jobs/xero-create-invoice.job';

export interface OpportunityStageChangedEvent {
  workspaceId: string;
  opportunityId: string;
  previousStage: string;
  currentStage: string;
  opportunityData: {
    buyerId: string;
    buyerEmail: string;
    buyerFirstName: string;
    buyerLastName: string;
    propertyAddress: string;
    engagementFee?: number;
    purchasePrice?: number;
    commissionRate?: number;
  };
}

@Injectable()
export class OpportunityStageChangedListener {
  private readonly logger = new Logger(OpportunityStageChangedListener.name);

  constructor(
    @InjectMessageQueue(MessageQueue.xeroInvoiceQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  @OnEvent('opportunity.stageChanged')
  async handleStageChange(event: OpportunityStageChangedEvent): Promise<void> {
    const {
      workspaceId,
      opportunityId,
      previousStage,
      currentStage,
      opportunityData,
    } = event;

    this.logger.log(
      `Opportunity ${opportunityId} stage changed: ${previousStage} -> ${currentStage}`,
    );

    // Engagement Fee Invoice - when stage changes to 'engagement'
    // This stage indicates the engagement agreement has been signed
    if (
      currentStage === 'engagement' &&
      previousStage !== 'engagement' &&
      opportunityData.engagementFee
    ) {
      await this.messageQueueService.add<XeroInvoiceJobData>(
        XeroCreateInvoiceJob.name,
        {
          workspaceId,
          opportunityId,
          invoiceType: 'engagement_fee',
          amount: opportunityData.engagementFee,
          buyerEmail: opportunityData.buyerEmail,
          buyerFirstName: opportunityData.buyerFirstName,
          buyerLastName: opportunityData.buyerLastName,
          propertyAddress: opportunityData.propertyAddress,
        },
        {
          retryLimit: 3,
        },
      );

      this.logger.log(
        `Queued engagement fee invoice for opportunity ${opportunityId}`,
      );
    }

    // Success Fee Invoice - when stage changes to 'exchanged'
    if (
      currentStage === 'exchanged' &&
      previousStage !== 'exchanged' &&
      opportunityData.purchasePrice
    ) {
      const commissionRate = opportunityData.commissionRate ?? 0.02; // Default 2%
      const successFee = Math.round(
        opportunityData.purchasePrice * commissionRate,
      );

      await this.messageQueueService.add<XeroInvoiceJobData>(
        XeroCreateInvoiceJob.name,
        {
          workspaceId,
          opportunityId,
          invoiceType: 'success_fee',
          amount: successFee,
          buyerEmail: opportunityData.buyerEmail,
          buyerFirstName: opportunityData.buyerFirstName,
          buyerLastName: opportunityData.buyerLastName,
          propertyAddress: opportunityData.propertyAddress,
        },
        {
          retryLimit: 3,
        },
      );

      this.logger.log(
        `Queued success fee invoice ($${successFee}) for opportunity ${opportunityId}`,
      );
    }
  }
}
