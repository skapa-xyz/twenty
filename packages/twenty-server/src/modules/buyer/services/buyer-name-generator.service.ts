import { Injectable, Logger } from '@nestjs/common';

import { type FullNameMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspaceAuthContext } from 'src/engine/api/common/interfaces/workspace-auth-context.interface';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { generateBuyerName } from 'src/modules/buyer/utils/generate-buyer-name.util';

type BuyerRecord = {
  id: string;
  buyerType?: string;
  createdAt?: string;
};

type PersonRecord = {
  id: string;
  nameFirstName?: string;
  nameLastName?: string;
  name?: FullNameMetadata;
};

@Injectable()
export class BuyerNameGeneratorService {
  private readonly logger = new Logger(BuyerNameGeneratorService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  /**
   * Regenerates a buyer's name based on its linked contacts and buyer type,
   * then updates the buyer record directly via the ORM (bypasses GraphQL hooks).
   */
  async regenerateBuyerName(
    workspaceId: string,
    buyerId: string,
    authContext?: WorkspaceAuthContext,
  ): Promise<void> {
    const effectiveAuthContext =
      authContext ?? buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      effectiveAuthContext,
      async () => {
        const buyerRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'buyer',
        );

        const personRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'person',
        );

        const buyer = (await buyerRepo.findOne({
          where: { id: buyerId },
        })) as BuyerRecord | null;

        if (!isDefined(buyer)) {
          this.logger.warn(`Buyer ${buyerId} not found, skipping name regen`);

          return;
        }

        const persons = (await personRepo.find({
          where: { buyerAccountId: buyerId },
        })) as PersonRecord[];

        const contacts = persons
          .map((p) => ({
            firstName: p.name?.firstName ?? p.nameFirstName ?? '',
            lastName: p.name?.lastName ?? p.nameLastName ?? '',
          }))
          .filter((c) => c.firstName || c.lastName);

        const newName = generateBuyerName({
          contacts,
          buyerType: buyer.buyerType,
          createdAt: buyer.createdAt ? new Date(buyer.createdAt) : undefined,
        });

        await buyerRepo.update(buyerId, { name: newName });

        this.logger.debug(`Regenerated buyer ${buyerId} name to: "${newName}"`);
      },
    );
  }
}
