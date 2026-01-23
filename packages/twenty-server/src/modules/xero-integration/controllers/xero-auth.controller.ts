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
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { XeroTokenService } from '../services/xero-token.service';
import { XeroClientService } from '../services/xero-client.service';

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
  async initiateAuth(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    this.validateConfigured();
    try {
      // Validate the token passed as query parameter
      if (!token) {
        throw new UnauthorizedException('Authentication token is required');
      }

      // Validate the token and extract workspace info
      const tokenData = await this.accessTokenService.validateToken(token);

      if (!tokenData.workspace || !tokenData.workspace.id) {
        throw new BadRequestException('Workspace context is required');
      }

      const workspaceId = tokenData.workspace.id;

      this.logger.log(
        `Initiating Xero OAuth flow for workspace ${workspaceId}`,
      );

      // Build authorization URL with PKCE parameters
      const authUrl = this.buildAuthorizationUrl(workspaceId);

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
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    this.validateConfigured();
    try {
      // Handle authorization denial
      if (error) {
        this.logger.warn(`Xero authorization error: ${error}`);
        return res.redirect(
          `/settings/integrations?xero_error=${encodeURIComponent(error)}`,
        );
      }

      // Validate required parameters
      if (!code || !state) {
        throw new BadRequestException(
          'Missing authorization code or state parameter',
        );
      }

      const workspaceId = state;

      this.logger.log(
        `Processing Xero OAuth callback for workspace ${workspaceId}`,
      );

      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);

      // Extract token data
      const expiresAt = new Date(
        Date.now() + tokenResponse.expires_in * 1000,
      );

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

      // Redirect back to settings page with success message
      res.redirect('/settings/integrations?xero_connected=true');
    } catch (error) {
      this.logger.error(
        `Failed to process Xero callback: ${error.message}`,
        error.stack,
      );
      res.redirect(
        `/settings/integrations?xero_error=${encodeURIComponent('Connection failed')}`,
      );
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
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.validateConfigured();
    try {
      const workspace = req['workspace'];

      if (!workspace || !workspace.id) {
        throw new BadRequestException('Workspace context is required');
      }

      const workspaceId = workspace.id;

      this.logger.log(`Disconnecting Xero for workspace ${workspaceId}`);

      // Mark connection as inactive
      await this.tokenService.markDisconnected(workspaceId);

      this.logger.log(
        `Successfully disconnected Xero from workspace ${workspaceId}`,
      );

      // Redirect back to settings
      res.redirect('/settings/integrations?xero_disconnected=true');
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
   * @param workspaceId - The workspace ID to encode in the state parameter
   * @returns Complete authorization URL
   */
  private buildAuthorizationUrl(workspaceId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: workspaceId, // Pass workspace ID to maintain context
    });

    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
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
