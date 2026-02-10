import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { generateBuyerName } from 'src/modules/buyer/utils/generate-buyer-name.util';

type BuyerCreateInput = {
  buyerType?: string;
  name?: string;
  [key: string]: unknown;
};

@WorkspaceQueryHook(`buyer.createMany`)
export class BuyerNameCreateManyPreQueryHook
  implements WorkspacePreQueryHookInstance
{
  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: CreateManyResolverArgs<BuyerCreateInput>,
  ): Promise<CreateManyResolverArgs<BuyerCreateInput>> {
    if (!payload.data) {
      return payload;
    }

    for (const record of payload.data) {
      if (record.name) {
        continue;
      }

      record.name = generateBuyerName({
        contacts: [],
        buyerType: record.buyerType,
      });
    }

    return payload;
  }
}
