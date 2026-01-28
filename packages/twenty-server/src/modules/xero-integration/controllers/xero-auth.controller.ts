import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  Logger,
  Query,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import { Response, Request } from 'express';

import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { XeroTokenService } from 'src/modules/xero-integration/services/xero-token.service';
import { XeroClientService } from 'src/modules/xero-integration/services/xero-client.service';

/**
 * Controller for handling Xero OAuth 2.0 authentication flow.
 *
 * This controller manages the complete OAuth cycle:
 * 1. Initiating authorization (GET /xero/auth)
 * 2. Handling callbacks from Xero (GET /xero/callback)
 * 3. Disconnecting integrations (GET /xero/disconnect)
 *
 * All endpoints require workspace authentication via JwtAuthGuard.
 */
@Controller('api/auth/xero')
export class XeroAuthController {
  private readonly logger = new Logger(XeroAuthController.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];
  private readonly isConfigured: boolean;

  constructor(
    private readonly tokenService: XeroTokenService,
    private readonly clientService: XeroClientService,
    private readonly accessTokenService: AccessTokenService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
  ) {
    // Load environment variables
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const redirectUri = process.env.XERO_REDIRECT_URI;
    const scopes = process.env.XERO_SCOPES;

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.warn(
        'XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REDIRECT_URI environment variables are not configured. ' +
          'Xero OAuth endpoints will not function.',
      );
      this.clientId = '';
      this.clientSecret = '';
      this.redirectUri = '';
      this.isConfigured = false;
    } else {
      this.clientId = clientId;
      this.clientSecret = clientSecret;
      this.redirectUri = redirectUri;
      this.isConfigured = true;
    }

    this.scopes = scopes
      ? scopes.split(',').map((s) => s.trim())
      : ['accounting.transactions', 'accounting.contacts', 'offline_access'];
  }

  /**
   * Validates that Xero integration is properly configured before operations.
   * @throws BadRequestException if not configured
   */
  private validateConfigured(): void {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'Xero integration is not configured. Please set XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REDIRECT_URI environment variables.',
      );
    }
  }

  /**
   * Initiates the Xero OAuth 2.0 authorization flow.
   *
   * This endpoint redirects the user to Xero's authorization page where they
   * can grant permissions to the application. The workspace ID is passed via
   * the state parameter to maintain context during the OAuth flow.
   *
   * Note: This endpoint accepts the JWT token as a query parameter because
   * browser redirects cannot include Authorization headers.
   *
   * @route GET /api/auth/xero
   * @param token - JWT access token passed as query parameter
   * @param res - Express response object for redirecting
   */
  @Get()
  async initiateAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.validateConfigured();
    try {
      // Manually validate the JWT token from query param or Authorization header,
      // since UserAuthGuard relies on GqlExecutionContext middleware that doesn't
      // run for /api/auth/* REST routes.
      const authContext =
        await this.accessTokenService.validateTokenByRequest(req);

      const workspace = authContext.workspace;

      if (!workspace || !workspace.id) {
        throw new BadRequestException('Workspace context is required');
      }

      this.logger.log(
        `Initiating Xero OAuth flow for workspace ${workspace.id}`,
      );

      // Build authorization URL with workspace domain config in state
      const authUrl = this.buildAuthorizationUrl(workspace.id, {
        subdomain: workspace.subdomain,
        customDomain: workspace.customDomain ?? undefined,
        isCustomDomainEnabled: workspace.isCustomDomainEnabled,
      });

      // Redirect user to Xero authorization page
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error(
        `Failed to initiate Xero auth: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to initiate Xero authorization',
      );
    }
  }

  /**
   * Handles the OAuth callback from Xero.
   *
   * After the user authorizes the application on Xero's site, they are
   * redirected back to this endpoint with an authorization code. This code
   * is exchanged for access and refresh tokens, which are then securely
   * stored.
   *
   * @route GET /api/auth/xero/callback
   * @param code - Authorization code from Xero
   * @param state - Workspace ID passed during authorization
   * @param error - Error code if authorization failed
   * @param res - Express response object
   */
  @Get('callback')
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') errorParam: string,
    @Res() res: Response,
  ): Promise<void> {
    this.validateConfigured();

    // Parse workspace domain config from the JSON state parameter.
    // Falls back to a relative redirect if state is missing or unparseable.
    let workspaceId: string | undefined;
    let workspaceDomainConfig:
      | {
          subdomain: string;
          customDomain?: string;
          isCustomDomainEnabled: boolean;
        }
      | undefined;

    if (state) {
      try {
        const parsed = JSON.parse(state);

        workspaceId = parsed.workspaceId;
        workspaceDomainConfig = {
          subdomain: parsed.subdomain,
          customDomain: parsed.customDomain,
          isCustomDomainEnabled: parsed.isCustomDomainEnabled ?? false,
        };
      } catch {
        // Legacy fallback: state was a plain workspaceId string
        workspaceId = state;
      }
    }

    try {
      // Handle authorization denial
      if (errorParam) {
        this.logger.warn(`Xero authorization error: ${errorParam}`);

        const errorRedirect = this.buildWorkspaceRedirectUrl(
          workspaceDomainConfig,
          '/settings/integrations',
          { xero_error: errorParam },
        );

        return res.redirect(errorRedirect);
      }

      // Validate required parameters
      if (!code || !workspaceId) {
        throw new BadRequestException(
          'Missing authorization code or state parameter',
        );
      }

      this.logger.log(
        `Processing Xero OAuth callback for workspace ${workspaceId}`,
      );

      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);

      // Extract token data
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Fetch tenant information from Xero
      const connections = await this.fetchXeroConnections(
        tokenResponse.access_token,
      );

      if (!connections || connections.length === 0) {
        throw new Error('No Xero organizations found for this account');
      }

      // Use the first tenant (organization) by default
      const primaryTenant = connections[0];

      // Save encrypted tokens to database
      await this.tokenService.saveTokens(workspaceId, {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        tenantId: primaryTenant.tenantId,
        tenantName: primaryTenant.tenantName,
        scopes: tokenResponse.scope?.split(' ') || this.scopes,
      });

      this.logger.log(
        `Successfully connected Xero organization "${primaryTenant.tenantName}" to workspace ${workspaceId}`,
      );

      // Redirect back to the user's workspace subdomain, not the app. admin subdomain
      const successRedirect = this.buildWorkspaceRedirectUrl(
        workspaceDomainConfig,
        '/settings/integrations',
        { xero_connected: 'true' },
      );

      res.redirect(successRedirect);
    } catch (error) {
      this.logger.error(
        `Failed to process Xero callback: ${error.message}`,
        error.stack,
      );

      const errorRedirect = this.buildWorkspaceRedirectUrl(
        workspaceDomainConfig,
        '/settings/integrations',
        { xero_error: 'Connection failed' },
      );

      res.redirect(errorRedirect);
    }
  }

  /**
   * Disconnects the Xero integration for the current workspace.
   *
   * This endpoint marks the Xero connection as inactive, preventing further
   * API calls. The tokens remain in the database but are no longer used.
   *
   * @route GET /api/auth/xero/disconnect
   * @param req - Express request object (contains workspace from JwtAuthGuard)
   * @param res - Express response object
   */
  @Get('disconnect')
  async disconnect(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.validateConfigured();
    try {
      const authContext =
        await this.accessTokenService.validateTokenByRequest(req);

      const workspace = authContext.workspace;

      if (!workspace || !workspace.id) {
        throw new BadRequestException('Workspace context is required');
      }

      this.logger.log(`Disconnecting Xero for workspace ${workspace.id}`);

      // Mark connection as inactive
      await this.tokenService.markDisconnected(workspace.id);

      this.logger.log(
        `Successfully disconnected Xero from workspace ${workspace.id}`,
      );

      // Redirect back to the user's workspace subdomain
      const redirectUrl = this.buildWorkspaceRedirectUrl(
        {
          subdomain: workspace.subdomain,
          customDomain: workspace.customDomain ?? undefined,
          isCustomDomainEnabled: workspace.isCustomDomainEnabled,
        },
        '/settings/integrations',
        { xero_disconnected: 'true' },
      );

      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(
        `Failed to disconnect Xero: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to disconnect Xero integration',
      );
    }
  }

  /**
   * Builds the Xero authorization URL with required OAuth 2.0 parameters.
   *
   * The state parameter encodes workspace context as JSON so the callback
   * can redirect the user back to their correct workspace subdomain.
   *
   * @param workspaceId - The workspace ID
   * @param domainConfig - Workspace subdomain/custom domain configuration
   * @returns Complete authorization URL
   */
  private buildAuthorizationUrl(
    workspaceId: string,
    domainConfig: {
      subdomain: string;
      customDomain?: string;
      isCustomDomainEnabled: boolean;
    },
  ): string {
    const state = JSON.stringify({
      workspaceId,
      subdomain: domainConfig.subdomain,
      customDomain: domainConfig.customDomain,
      isCustomDomainEnabled: domainConfig.isCustomDomainEnabled,
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state,
    });

    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  }

  /**
   * Builds a redirect URL targeting the correct workspace subdomain.
   *
   * Uses WorkspaceDomainsService when domain config is available, otherwise
   * falls back to a relative path (for legacy state format).
   */
  private buildWorkspaceRedirectUrl(
    domainConfig:
      | {
          subdomain: string;
          customDomain?: string;
          isCustomDomainEnabled: boolean;
        }
      | undefined,
    pathname: string,
    searchParams: Record<string, string>,
  ): string {
    if (!domainConfig) {
      const qs = new URLSearchParams(searchParams).toString();

      return `${pathname}?${qs}`;
    }

    const url = this.workspaceDomainsService.buildWorkspaceURL({
      workspace: {
        subdomain: domainConfig.subdomain,
        customDomain: domainConfig.customDomain ?? null,
        isCustomDomainEnabled: domainConfig.isCustomDomainEnabled,
      },
      pathname,
      searchParams,
    });

    return url.toString();
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   *
   * @param code - Authorization code from Xero
   * @returns Token response containing access_token, refresh_token, and metadata
   */
  private async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  }> {
    const tokenUrl = 'https://identity.xero.com/connect/token';

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });

    const authHeader = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      this.logger.error(`Xero token exchange failed: ${errorText}`);
      throw new Error(
        `Failed to exchange authorization code: ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Fetches the list of Xero organizations (tenants) the user has access to.
   *
   * @param accessToken - Valid Xero access token
   * @returns Array of tenant connections
   */
  private async fetchXeroConnections(accessToken: string): Promise<
    Array<{
      tenantId: string;
      tenantName: string;
      tenantType: string;
    }>
  > {
    const connectionsUrl = 'https://api.xero.com/connections';

    const response = await fetch(connectionsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      this.logger.error(`Failed to fetch Xero connections: ${errorText}`);
      throw new Error('Failed to fetch Xero organizations');
    }

    return response.json();
  }
}
