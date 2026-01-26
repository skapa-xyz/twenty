import { UseFilters, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';

import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { FormsLiveTokenService } from 'src/modules/formslive-integration/services/formslive-token.service';
import { FormsLiveTemplateService } from 'src/modules/formslive-integration/services/formslive-template.service';

/**
 * GraphQL Resolver for FormsLive connection management.
 *
 * Provides queries and mutations for:
 * - Checking connection status
 * - Listing available templates
 * - Setting the engagement template
 * - Disconnecting FormsLive
 *
 * Note: The main connect flow uses REST endpoints for simpler token handling.
 * GraphQL is used for post-connection operations.
 */
@Resolver()
@UsePipes(ResolverValidationPipe)
@UseFilters(AuthGraphqlApiExceptionFilter)
@UseGuards(WorkspaceAuthGuard)
export class FormsLiveConnectionResolver {
  private readonly logger = new Logger(FormsLiveConnectionResolver.name);

  constructor(
    private readonly tokenService: FormsLiveTokenService,
    private readonly templateService: FormsLiveTemplateService,
  ) {}

  /**
   * Gets the current FormsLive connection status for the user.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @returns Connection status and configuration
   */
  @UseGuards(NoPermissionGuard)
  @Query(() => String, { name: 'formsLiveConnectionStatus', nullable: true })
  async getConnectionStatus(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<string | null> {
    const connection = await this.tokenService.getConnection(
      user.id,
      workspace.id,
    );

    if (!connection) {
      return null;
    }

    return JSON.stringify({
      isConnected: true,
      australianState: connection.australianState,
      agencyName: connection.agencyName,
      engagementTemplateId: connection.engagementTemplateId,
      engagementTemplateName: connection.engagementTemplateName,
    });
  }

  /**
   * Lists available FormsLive templates for the user.
   *
   * Only available when connected to FormsLive.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @returns Array of available templates as JSON string
   */
  @UseGuards(NoPermissionGuard)
  @Query(() => String, { name: 'formsLiveTemplates', nullable: true })
  async listTemplates(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<string | null> {
    const connection = await this.tokenService.getConnection(
      user.id,
      workspace.id,
    );

    if (!connection) {
      return null;
    }

    try {
      const templates = await this.templateService.listActiveTemplates(
        user.id,
        workspace.id,
      );

      return JSON.stringify(templates);
    } catch {
      return null;
    }
  }

  /**
   * Sets the engagement template for automatic form creation.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @param templateId - The FormsLive template ID to use
   * @returns True if successful
   */
  @UseGuards(NoPermissionGuard)
  @Mutation(() => Boolean, { name: 'setFormsLiveEngagementTemplate' })
  async setEngagementTemplate(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('templateId', { type: () => Int }) templateId: number,
  ): Promise<boolean> {
    // Get template details to store the name
    const template = await this.templateService.getTemplate(
      user.id,
      workspace.id,
      templateId,
    );

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    await this.tokenService.updateEngagementTemplate(
      user.id,
      workspace.id,
      templateId,
      template.name,
    );

    return true;
  }

  /**
   * Disconnects FormsLive for the current user.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @returns True if disconnected successfully
   */
  @UseGuards(NoPermissionGuard)
  @Mutation(() => Boolean, { name: 'disconnectFormsLive' })
  async disconnect(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<boolean> {
    await this.tokenService.markDisconnected(user.id, workspace.id);

    return true;
  }

  /**
   * Searches templates by name.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @param searchTerm - Term to search for
   * @returns Matching templates as JSON string
   */
  @UseGuards(NoPermissionGuard)
  @Query(() => String, { name: 'searchFormsLiveTemplates', nullable: true })
  async searchTemplates(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('searchTerm') searchTerm: string,
  ): Promise<string | null> {
    const connection = await this.tokenService.getConnection(
      user.id,
      workspace.id,
    );

    if (!connection) {
      return null;
    }

    try {
      const templates = await this.templateService.searchTemplates(
        user.id,
        workspace.id,
        searchTerm,
      );

      return JSON.stringify(templates);
    } catch {
      return null;
    }
  }
}
