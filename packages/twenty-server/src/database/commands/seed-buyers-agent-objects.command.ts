import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Command, CommandRunner, Option } from 'nest-commander';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { BuyersAgentObjectsService } from 'src/engine/workspace-manager/buyers-agent-objects/buyers-agent-objects.service';

type SeedBuyersAgentObjectsCommandOptions = {
  workspaceId?: string;
  dryRun?: boolean;
};

@Command({
  name: 'workspace:seed:buyers-agent-objects',
  description:
    'Seed Buyers Agent custom objects (Property, Buyer, PropertyShortlist) to workspaces. ' +
    'Runs for all active workspaces by default, or a specific workspace with --workspace-id.',
})
export class SeedBuyersAgentObjectsCommand extends CommandRunner {
  private readonly logger = new Logger(SeedBuyersAgentObjectsCommand.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly buyersAgentObjectsService: BuyersAgentObjectsService,
  ) {
    super();
  }

  @Option({
    flags: '-w, --workspace-id <workspaceId>',
    description: 'Specific workspace ID to seed (optional)',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Show what would be done without making changes',
  })
  parseDryRun(): boolean {
    return true;
  }

  async run(
    _passedParams: string[],
    options: SeedBuyersAgentObjectsCommandOptions,
  ): Promise<void> {
    const { workspaceId, dryRun } = options;

    this.logger.log('Starting Buyers Agent objects seeding...');

    if (dryRun) {
      this.logger.log('[DRY RUN] No changes will be made');
    }

    try {
      let workspaces: WorkspaceEntity[];

      if (workspaceId) {
        // Seed specific workspace
        const workspace = await this.workspaceRepository.findOne({
          where: { id: workspaceId },
        });

        if (!workspace) {
          this.logger.error(`Workspace not found: ${workspaceId}`);

          return;
        }

        workspaces = [workspace];
      } else {
        // Get all active workspaces
        workspaces = await this.workspaceRepository.find({
          where: {
            activationStatus: WorkspaceActivationStatus.ACTIVE,
          },
        });
      }

      this.logger.log(`Found ${workspaces.length} workspace(s) to process`);

      let successCount = 0;
      let errorCount = 0;

      for (const workspace of workspaces) {
        try {
          this.logger.log(
            `Processing workspace: ${workspace.displayName || workspace.id}`,
          );

          if (dryRun) {
            this.logger.log(
              `[DRY RUN] Would create Buyers Agent objects for workspace ${workspace.id}`,
            );
          } else {
            await this.buyersAgentObjectsService.ensureObjectsExist(
              workspace.id,
            );
            this.logger.log(`Successfully seeded workspace ${workspace.id}`);
          }

          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to seed workspace ${workspace.id}: ${error.message}`,
          );
          errorCount++;
        }
      }

      this.logger.log('');
      this.logger.log('=== Seeding Complete ===');
      this.logger.log(`Successful: ${successCount}`);
      this.logger.log(`Failed: ${errorCount}`);

      if (dryRun) {
        this.logger.log('');
        this.logger.log(
          'This was a dry run. Run without --dry-run to apply changes.',
        );
      }
    } catch (error) {
      this.logger.error(`Command failed: ${error.message}`);
      this.logger.error(error.stack);
    }
  }
}
