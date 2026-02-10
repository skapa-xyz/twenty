import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type QueryResultFieldValue } from 'src/engine/api/graphql/workspace-query-runner/factories/query-result-getters/interfaces/query-result-field-value';
import { type WorkspaceAuthContext } from 'src/engine/api/common/interfaces/workspace-auth-context.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { BuyerNameGeneratorService } from 'src/modules/buyer/services/buyer-name-generator.service';

@WorkspaceQueryHook({
  key: `buyer.updateOne`,
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class BuyerNameUpdateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  constructor(
    private readonly buyerNameGeneratorService: BuyerNameGeneratorService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: QueryResultFieldValue,
  ): Promise<void> {
    const workspace = authContext.workspace;

    if (!isDefined(workspace)) {
      return;
    }

    const records = payload as { id: string }[];
    const buyer = records[0];

    if (!isDefined(buyer?.id)) {
      return;
    }

    await this.buyerNameGeneratorService.regenerateBuyerName(
      workspace.id,
      buyer.id,
      authContext as WorkspaceAuthContext,
    );
  }
}
