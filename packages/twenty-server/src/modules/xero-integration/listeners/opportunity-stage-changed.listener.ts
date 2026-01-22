import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';

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

@Injectable()
export class OpportunityStageChangedListener {
  private readonly logger = new Logger(OpportunityStageChangedListener.name);

  constructor(
    @InjectQueue(MessageQueue.xeroInvoiceQueue)
    private readonly invoiceQueue: Queue<XeroInvoiceJobData>,
  ) {}

  @OnEvent('opportunity.stageChanged')
  async handleStageChange(event: OpportunityStageChangedEvent): Promise<void> {
    const { workspaceId, opportunityId, previousStage, currentStage, opportunityData } = event;

    this.logger.log(
      `Opportunity ${opportunityId} stage changed: ${previousStage} -> ${currentStage}`,
    );

    // Engagement Fee Invoice - when stage changes to 'engagement_signed'
    if (
      currentStage === 'engagement_signed' &&
      previousStage !== 'engagement_signed' &&
      opportunityData.engagementFee
    ) {
      await this.invoiceQueue.add({
        workspaceId,
        opportunityId,
        invoiceType: 'engagement_fee',
        amount: opportunityData.engagementFee,
        buyerEmail: opportunityData.buyerEmail,
        buyerFirstName: opportunityData.buyerFirstName,
        buyerLastName: opportunityData.buyerLastName,
        propertyAddress: opportunityData.propertyAddress,
      });

      this.logger.log(`Queued engagement fee invoice for opportunity ${opportunityId}`);
    }

    // Success Fee Invoice - when stage changes to 'exchanged'
    if (
      currentStage === 'exchanged' &&
      previousStage !== 'exchanged' &&
      opportunityData.purchasePrice
    ) {
      const commissionRate = opportunityData.commissionRate ?? 0.02; // Default 2%
      const successFee = Math.round(opportunityData.purchasePrice * commissionRate);

      await this.invoiceQueue.add({
        workspaceId,
        opportunityId,
        invoiceType: 'success_fee',
        amount: successFee,
        buyerEmail: opportunityData.buyerEmail,
        buyerFirstName: opportunityData.buyerFirstName,
        buyerLastName: opportunityData.buyerLastName,
        propertyAddress: opportunityData.propertyAddress,
      });

      this.logger.log(
        `Queued success fee invoice ($${successFee}) for opportunity ${opportunityId}`,
      );
    }
  }
}
