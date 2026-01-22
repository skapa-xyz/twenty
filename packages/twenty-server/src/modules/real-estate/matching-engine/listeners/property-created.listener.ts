import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';

import {
  PropertyMatchJobData,
  PropertyMatchProcessor,
} from '../jobs/property-match.job';

export interface PropertyCreatedEvent {
  propertyId: string;
  workspaceId: string;
}

@Injectable()
export class PropertyCreatedListener {
  constructor(
    @InjectMessageQueue(MessageQueue.propertyMatchQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  @OnEvent('property.created')
  async handlePropertyCreated(event: PropertyCreatedEvent): Promise<void> {
    await this.messageQueueService.add<PropertyMatchJobData>(
      PropertyMatchProcessor.name,
      {
        propertyId: event.propertyId,
        workspaceId: event.workspaceId,
      },
      {
        retryLimit: 3,
      },
    );
  }
}
