import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MatchingEngineService } from 'src/modules/real-estate/matching-engine/services/matching-engine.service';
import { PropertyEntity } from 'src/modules/real-estate/property/entities/property.entity';

/**
 * Job data for property matching operations
 *
 * This processor handles matching newly created properties against existing briefs.
 * Additional job types (MATCH_NEW_BRIEF, REMATCH_ALL) can be added as the
 * MatchingEngineService evolves to support reverse matching operations.
 */
export interface PropertyMatchJobData {
  propertyId: string;
  workspaceId: string;
  minScore?: number;
}

/**
 * BullMQ job processor for handling asynchronous property matching operations
 *
 * This processor handles matching newly created properties against existing briefs:
 * - Loads the property entity from the database
 * - Uses the MatchingEngineService to find matching briefs
 * - Creates PropertyMatch records for all matches above the threshold
 * - Provides detailed logging for debugging and monitoring
 *
 * The processor:
 * - Uses the MatchingEngineService to calculate match scores
 * - Creates PropertyMatch records for qualifying matches (default min score: 75)
 * - Handles errors gracefully with logging
 * - Supports retry mechanism through BullMQ's error handling
 *
 * Future enhancements:
 * - MATCH_NEW_BRIEF: Reverse matching when a brief is created
 * - REMATCH_ALL: Batch recalculation of all matches
 * - Notification triggers for agents when matches are created
 */
@Processor(MessageQueue.propertyMatchQueue)
export class PropertyMatchProcessor {
  private readonly logger = new Logger(PropertyMatchProcessor.name);

  constructor(
    private readonly matchingEngineService: MatchingEngineService,
    @InjectRepository(PropertyEntity)
    private readonly propertyRepository: Repository<PropertyEntity>,
  ) {}

  /**
   * Main job handler for property matching
   *
   * @param data - Job data containing propertyId, workspaceId, and optional minScore
   * @throws Error if the matching process fails (triggers BullMQ retry)
   */
  @Process(PropertyMatchProcessor.name)
  async handle(data: PropertyMatchJobData): Promise<void> {
    const { propertyId, workspaceId, minScore = 75 } = data;

    this.logger.log(`Processing match job for property ${propertyId}`);

    try {
      // Load property with full details
      const property = await this.propertyRepository.findOne({
        where: { id: propertyId, workspaceId },
      });

      if (!property) {
        this.logger.warn(
          `Property ${propertyId} not found in workspace ${workspaceId}`,
        );
        return;
      }

      // Find matching briefs
      const matches = await this.matchingEngineService.findMatchingBriefs(
        property,
        minScore,
      );

      this.logger.log(
        `Found ${matches.length} matches for property ${propertyId}`,
      );

      // Create match records
      if (matches.length > 0) {
        const created = await this.matchingEngineService.createMatches(
          property,
          matches,
        );

        this.logger.log(
          `Created ${created.length} new match records`,
        );

        // TODO: Trigger notifications to agents
        // await this.notificationService.notifyNewMatches(created);
      }
    } catch (error) {
      this.logger.error(
        `Match job failed for property ${propertyId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }
}
