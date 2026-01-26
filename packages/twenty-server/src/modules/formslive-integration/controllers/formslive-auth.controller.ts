import { Controller, Get, Post, UseGuards, Logger, Body } from '@nestjs/common';

import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { FormsLiveTokenService } from 'src/modules/formslive-integration/services/formslive-token.service';
import { FormsLiveClientService } from 'src/modules/formslive-integration/services/formslive-client.service';
import { AustralianState } from 'src/modules/formslive-integration/entities/formslive-connection.entity';

/**
 * Request body for connecting FormsLive
 */
type ConnectFormsLiveBody = {
  accessToken: string;
  australianState: AustralianState;
};

/**
 * FormsLive Authentication Controller
 *
 * Unlike Xero which uses OAuth 2.0, FormsLive uses a simpler authentication
 * model with API key + user access token. The access token is obtained
 * from FormsLive's user settings and entered directly in the CRM.
 *
 * Authentication flow:
 * 1. User navigates to FormsLive settings in CRM
 * 2. User enters their FormsLive access token and selects their state
 * 3. CRM validates the token by making a test API call
 * 4. If valid, token is encrypted and stored
 *
 * Endpoints:
 * - POST /api/auth/formslive/connect - Connect with access token
 * - POST /api/auth/formslive/disconnect - Disconnect FormsLive
 * - GET /api/auth/formslive/status - Check connection status
 */
@Controller('api/auth/formslive')
export class FormsLiveAuthController {
  private readonly logger = new Logger(FormsLiveAuthController.name);

  constructor(
    private readonly tokenService: FormsLiveTokenService,
    private readonly clientService: FormsLiveClientService,
  ) {}

  /**
   * Connects FormsLive with user's access token.
   *
   * Validates the token by fetching user info from FormsLive API,
   * then stores the encrypted token.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @param body - Access token and state configuration
   * @returns Connection result with user/agency info
   */
  @Post('connect')
  @UseGuards(UserAuthGuard, NoPermissionGuard)
  async connect(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Body() body: ConnectFormsLiveBody,
  ): Promise<{
    success: boolean;
    message: string;
    formsLiveUserId?: string;
    agencyName?: string;
  }> {
    const { accessToken, australianState } = body;

    this.logger.log(
      `User ${user.id} attempting to connect FormsLive (${australianState})`,
    );

    try {
      // First save the token so we can make API calls
      await this.tokenService.saveConnection(user.id, workspace.id, {
        accessToken,
        australianState,
      });

      // Validate by fetching user info from FormsLive
      const userInfo = await this.clientService.get<{
        id: number;
        name: string;
        email: string;
        agency: {
          id: number;
          name: string;
        };
      }>(user.id, workspace.id, '/user/');

      // Update connection with FormsLive user info
      await this.tokenService.saveConnection(user.id, workspace.id, {
        accessToken,
        australianState,
        formsLiveUserId: String(userInfo.id),
        agencyName: userInfo.agency?.name,
      });

      this.logger.log(
        `User ${user.id} successfully connected FormsLive account: ${userInfo.agency?.name}`,
      );

      return {
        success: true,
        message: 'FormsLive connected successfully',
        formsLiveUserId: String(userInfo.id),
        agencyName: userInfo.agency?.name,
      };
    } catch (error) {
      this.logger.error(
        `Failed to connect FormsLive for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Mark as disconnected if validation failed
      await this.tokenService.markDisconnected(user.id, workspace.id);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to connect FormsLive',
      };
    }
  }

  /**
   * Disconnects FormsLive for the current user.
   *
   * Marks the connection as inactive but preserves the record for audit.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @returns Disconnect result
   */
  @Post('disconnect')
  @UseGuards(UserAuthGuard, NoPermissionGuard)
  async disconnect(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`User ${user.id} disconnecting FormsLive`);

    await this.tokenService.markDisconnected(user.id, workspace.id);

    return {
      success: true,
      message: 'FormsLive disconnected successfully',
    };
  }

  /**
   * Gets the current FormsLive connection status.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @returns Connection status and metadata
   */
  @Get('status')
  @UseGuards(UserAuthGuard, NoPermissionGuard)
  async getStatus(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<{
    isConnected: boolean;
    australianState?: AustralianState;
    agencyName?: string;
    engagementTemplateId?: number;
    engagementTemplateName?: string;
  }> {
    const connection = await this.tokenService.getConnection(
      user.id,
      workspace.id,
    );

    if (!connection) {
      return { isConnected: false };
    }

    return {
      isConnected: true,
      australianState: connection.australianState,
      agencyName: connection.agencyName ?? undefined,
      engagementTemplateId: connection.engagementTemplateId ?? undefined,
      engagementTemplateName: connection.engagementTemplateName ?? undefined,
    };
  }

  /**
   * Updates the Australian state for the connection.
   *
   * @param user - The authenticated user
   * @param workspace - The current workspace
   * @param body - New state configuration
   * @returns Update result
   */
  @Post('state')
  @UseGuards(UserAuthGuard, NoPermissionGuard)
  async updateState(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Body() body: { australianState: AustralianState },
  ): Promise<{ success: boolean }> {
    await this.tokenService.updateState(
      user.id,
      workspace.id,
      body.australianState,
    );

    this.logger.log(
      `User ${user.id} updated FormsLive state to ${body.australianState}`,
    );

    return { success: true };
  }
}
