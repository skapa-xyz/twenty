import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { generateBuyerName } from 'src/modules/buyer/utils/generate-buyer-name.util';

type BuyerCreateInput = {
  buyerType?: string;
  name?: string;
  [key: string]: unknown;
};

@WorkspaceQueryHook(`buyer.createOne`)
export class BuyerNameCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<BuyerCreateInput>,
  ): Promise<CreateOneResolverArgs<BuyerCreateInput>> {
    if (!payload.data) {
      return payload;
    }

    // Don't overwrite an explicitly provided name
    if (payload.data.name) {
      return payload;
    }

    // At creation time, no persons are linked yet (FK is on Person side),
    // so the initial name is based on buyerType + date only.
    payload.data.name = generateBuyerName({
      contacts: [],
      buyerType: payload.data.buyerType,
    });

    return payload;
  }
}
