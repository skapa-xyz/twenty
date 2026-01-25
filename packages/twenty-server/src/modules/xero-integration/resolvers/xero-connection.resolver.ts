import { UseFilters, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { Query, Resolver, Mutation } from '@nestjs/graphql';

import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { XeroConnectionStatus } from 'src/modules/xero-integration/types/xero-connection-status.type';
import { XeroTokenService } from 'src/modules/xero-integration/services/xero-token.service';

/**
 * GraphQL resolver for Xero connection status.
 * Used by the Settings → Integrations page to display connection state.
 */
@Resolver()
@UsePipes(ResolverValidationPipe)
@UseFilters(AuthGraphqlApiExceptionFilter)
@UseGuards(WorkspaceAuthGuard)
export class XeroConnectionResolver {
  private readonly logger = new Logger(XeroConnectionResolver.name);

  constructor(private readonly xeroTokenService: XeroTokenService) {}

  /**
   * Query the Xero connection status for the current workspace.
   * Returns connection information if connected, or null if not connected.
   */
  @UseGuards(NoPermissionGuard)
  @Query(() => XeroConnectionStatus, {
    nullable: true,
    description: 'Get the Xero connection status for the current workspace',
  })
  async xeroConnection(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<XeroConnectionStatus | null> {
    this.logger.log(
      `xeroConnection query called for workspace ${workspace?.id}`,
    );
    const tokens = await this.xeroTokenService.getTokens(workspace.id);

    if (!tokens) {
      return null;
    }

    return {
      isConnected: true,
      tenantName: tokens.tenantName,
      connectedAt: tokens.expiresAt, // Note: Using expiresAt as we don't have createdAt in tokens
    };
  }

  /**
   * Disconnect the Xero integration for the current workspace.
   * This marks the connection as inactive, preventing further API calls.
   */
  @UseGuards(NoPermissionGuard)
  @Mutation(() => Boolean, {
    description: 'Disconnect the Xero integration for the current workspace',
  })
  async disconnectXero(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<boolean> {
    await this.xeroTokenService.markDisconnected(workspace.id);

    return true;
  }
}
