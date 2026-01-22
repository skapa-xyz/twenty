import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  PROPERTY_MATCH_QUEUE,
  PropertyMatchJobData,
} from '../jobs/property-match.job';

export interface PropertyCreatedEvent {
  propertyId: string;
  workspaceId: string;
}

@Injectable()
export class PropertyCreatedListener {
  constructor(
    @InjectQueue(PROPERTY_MATCH_QUEUE)
    private readonly matchQueue: Queue<PropertyMatchJobData>,
  ) {}

  @OnEvent('property.created')
  async handlePropertyCreated(event: PropertyCreatedEvent): Promise<void> {
    await this.matchQueue.add(
      {
        propertyId: event.propertyId,
        workspaceId: event.workspaceId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }
}
