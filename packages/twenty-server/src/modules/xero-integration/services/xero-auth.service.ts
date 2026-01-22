import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { CustomError } from 'twenty-shared/utils';

import { XeroConnectionEntity } from '../entities/xero-connection.entity';

/**
 * Error codes specific to XeroAuthService
 */
export enum XeroAuthExceptionCode {
  INVALID_CODE_VERIFIER = 'INVALID_CODE_VERIFIER',
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  INVALID_STATE = 'INVALID_STATE',
}

/**
 * Interface for OAuth2 token response from Xero
 */
export interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Interface for Xero tenant/organization information
 */
export interface XeroTenant {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName?: string;
  createdDateUtc?: string;
  updatedDateUtc?: string;
}

/**
 * PKCE code challenge and verifier pair
 */
export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * XeroAuthService - OAuth2 Authorization Code Flow with PKCE
 *
 * This service implements the OAuth2 authorization code flow with PKCE (Proof Key for Code Exchange)
 * for secure integration with Xero's accounting platform.
 *
 * OAuth2 Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. Build authorization URL with code challenge
 * 3. User authorizes in Xero and is redirected back with authorization code
 * 4. Exchange authorization code for access and refresh tokens using code verifier
 * 5. Store encrypted tokens in database
 * 6. Refresh access tokens when they expire
 *
 * PKCE (RFC 7636) provides additional security for OAuth2 flows by preventing
 * authorization code interception attacks.
 *
 * Usage:
 * ```typescript
 * // Step 1: Generate authorization URL
 * const { url, codeVerifier, state } = await xeroAuthService.getAuthorizationUrl(workspaceId);
 * // Store codeVerifier and state in session/cache
 *
 * // Step 2: After redirect, exchange code for tokens
 * const connection = await xeroAuthService.exchangeCodeForTokens(
 *   code,
 *   codeVerifier,
 *   workspaceId
 * );
 * ```
 */
@Injectable()
export class XeroAuthService {
  private readonly logger = new Logger(XeroAuthService.name);

  // Xero OAuth2 endpoints
  private readonly authorizationUrl = 'https://login.xero.com/identity/connect/authorize';
  private readonly tokenUrl = 'https://identity.xero.com/connect/token';
  private readonly connectionsUrl = 'https://api.xero.com/connections';

  // OAuth credentials from environment variables
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  // Required OAuth scopes for the integration
  private readonly scopes = [
    'offline_access',         // Required for refresh tokens
    'accounting.transactions', // Invoice creation and management
    'accounting.contacts.read', // Contact lookup
    'accounting.settings.read', // Account settings
  ];

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(XeroConnectionEntity, 'core')
    private readonly xeroConnectionRepository: Repository<XeroConnectionEntity>,
  ) {
    // Load OAuth credentials from environment
    this.clientId = process.env.AUTH_XERO_CLIENT_ID || '';
    this.clientSecret = process.env.AUTH_XERO_CLIENT_SECRET || '';
    this.callbackUrl = process.env.AUTH_XERO_CALLBACK_URL || '';

    if (!this.clientId || !this.clientSecret || !this.callbackUrl) {
      this.logger.error(
        'Xero OAuth credentials not configured. Required environment variables: ' +
        'AUTH_XERO_CLIENT_ID, AUTH_XERO_CLIENT_SECRET, AUTH_XERO_CALLBACK_URL',
      );
    }
  }

  /**
   * Generate a cryptographically secure random string for PKCE code verifier
   *
   * The code verifier is a high-entropy cryptographic random string using the
   * unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
   * with a minimum length of 43 characters and a maximum length of 128 characters.
   *
   * @returns Base64 URL-encoded random string
   */
  private generateCodeVerifier(): string {
    // Generate 32 random bytes (256 bits) for high entropy
    const randomBytes = crypto.randomBytes(32);

    // Base64 URL-encode (without padding) to get valid code verifier
    return randomBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code challenge from code verifier
   *
   * The code challenge is created by SHA256 hashing the code verifier
   * and base64url encoding the result.
   *
   * @param codeVerifier - The code verifier string
   * @returns Base64 URL-encoded SHA256 hash of the code verifier
   */
  private generateCodeChallenge(codeVerifier: string): string {
    // Hash the code verifier with SHA256
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();

    // Base64 URL-encode (without padding)
    return hash
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code verifier and challenge pair
   *
   * @returns Object containing both code verifier and code challenge
   */
  generatePKCEPair(): PKCEPair {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
    };
  }

  /**
   * Generate a secure random state parameter for CSRF protection
   *
   * @returns Base64 URL-encoded random state string
   */
  private generateState(): string {
    const randomBytes = crypto.randomBytes(16);
    return randomBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Build the Xero OAuth2 authorization URL
   *
   * This URL should be used to redirect the user to Xero for authorization.
   * After the user authorizes the application, Xero will redirect back to the
   * callback URL with an authorization code.
   *
   * IMPORTANT: The codeVerifier and state MUST be stored in session/cache
   * associated with the user/workspace, as they will be needed to exchange
   * the authorization code for tokens.
   *
   * @param workspaceId - The workspace ID requesting authorization
   * @param state - Optional state parameter for CSRF protection. If not provided, one will be generated.
   * @returns Object containing the authorization URL, code verifier, and state
   */
  async getAuthorizationUrl(
    workspaceId: string,
    state?: string,
  ): Promise<{ url: string; codeVerifier: string; state: string }> {
    this.validateCredentials();

    // Generate PKCE pair
    const { codeVerifier, codeChallenge } = this.generatePKCEPair();

    // Generate or use provided state parameter
    const stateParam = state || this.generateState();

    // Encode state with workspace ID for validation on callback
    const encodedState = Buffer.from(
      JSON.stringify({
        workspaceId,
        state: stateParam,
        timestamp: Date.now(),
      }),
    ).toString('base64url');

    // Build authorization URL with PKCE parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: this.scopes.join(' '),
      state: encodedState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256', // SHA256 hashing method
    });

    const url = `${this.authorizationUrl}?${params.toString()}`;

    this.logger.log(
      `Generated Xero authorization URL for workspace ${workspaceId}`,
    );

    return {
      url,
      codeVerifier,
      state: stateParam,
    };
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * This method should be called in the OAuth callback handler after the user
   * has authorized the application. It exchanges the authorization code for
   * access and refresh tokens using the PKCE code verifier.
   *
   * After successful token exchange, this method will:
   * 1. Fetch the list of authorized Xero tenants/organizations
   * 2. Store the connection with the first tenant (or update existing connection)
   * 3. Return the stored connection entity
   *
   * @param code - Authorization code from OAuth callback
   * @param codeVerifier - PKCE code verifier that was generated for this flow
   * @param workspaceId - The workspace ID this connection belongs to
   * @returns The stored XeroConnectionEntity
   * @throws CustomError if token exchange fails or no tenants are available
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    workspaceId: string,
  ): Promise<XeroConnectionEntity> {
    this.validateCredentials();

    if (!codeVerifier || codeVerifier.length < 43) {
      throw new CustomError(
        'Invalid code verifier: must be at least 43 characters',
        XeroAuthExceptionCode.INVALID_CODE_VERIFIER,
      );
    }

    try {
      this.logger.log(
        `Exchanging authorization code for tokens (workspace: ${workspaceId})`,
      );

      // Exchange authorization code for tokens
      const tokenResponse = await this.requestTokens({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.callbackUrl,
        code_verifier: codeVerifier,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      // Fetch authorized tenants/organizations
      const tenants = await this.fetchTenants(tokenResponse.access_token);

      if (!tenants || tenants.length === 0) {
        throw new CustomError(
          'No Xero organizations/tenants found for this authorization',
          XeroAuthExceptionCode.TOKEN_EXCHANGE_FAILED,
        );
      }

      // Use the first tenant (in production, you might want to let user choose)
      const tenant = tenants[0];

      // Calculate token expiration
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(
        tokenExpiresAt.getSeconds() + tokenResponse.expires_in,
      );

      // Parse scopes from response
      const scopes = tokenResponse.scope
        ? tokenResponse.scope.split(' ')
        : this.scopes;

      // Find or create connection
      let connection = await this.xeroConnectionRepository.findOne({
        where: { workspaceId },
      });

      if (connection) {
        // Update existing connection
        connection.tenantId = tenant.tenantId;
        connection.tenantName = tenant.tenantName || null;
        connection.encryptedAccessToken = tokenResponse.access_token;
        connection.encryptedRefreshToken = tokenResponse.refresh_token;
        connection.tokenExpiresAt = tokenExpiresAt;
        connection.scopes = scopes;
        connection.isActive = true;
        connection.updatedAt = new Date();
      } else {
        // Create new connection
        connection = this.xeroConnectionRepository.create({
          workspaceId,
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName || null,
          encryptedAccessToken: tokenResponse.access_token,
          encryptedRefreshToken: tokenResponse.refresh_token,
          tokenExpiresAt,
          scopes,
          isActive: true,
        });
      }

      // Save to database
      const savedConnection =
        await this.xeroConnectionRepository.save(connection);

      this.logger.log(
        `Successfully stored Xero connection for workspace ${workspaceId}, ` +
        `tenant: ${tenant.tenantName} (${tenant.tenantId})`,
      );

      return savedConnection;
    } catch (error) {
      this.logger.error(
        `Failed to exchange authorization code for tokens (workspace: ${workspaceId})`,
        error.response?.data || error.message,
      );

      if (error instanceof CustomError) {
        throw error;
      }

      throw new CustomError(
        `Token exchange failed: ${error.response?.data?.error_description || error.message}`,
        XeroAuthExceptionCode.TOKEN_EXCHANGE_FAILED,
      );
    }
  }

  /**
   * Refresh an expired access token using the refresh token
   *
   * This method can be called manually or automatically when an access token expires.
   * It uses the refresh token to obtain a new access token and refresh token.
   *
   * Note: Xero may return a new refresh token in the response. If a new refresh token
   * is provided, it should be stored and the old one discarded.
   *
   * @param refreshToken - The refresh token to use for obtaining new tokens
   * @param workspaceId - Optional workspace ID for connection lookup and update
   * @returns Object containing new access token, refresh token, and expiration
   * @throws CustomError if token refresh fails
   */
  async refreshAccessToken(
    refreshToken: string,
    workspaceId?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    this.validateCredentials();

    try {
      this.logger.log(
        `Refreshing Xero access token${workspaceId ? ` for workspace ${workspaceId}` : ''}`,
      );

      // Request new tokens using refresh token
      const tokenResponse = await this.requestTokens({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      // Calculate token expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

      // If workspace ID is provided, update the stored connection
      if (workspaceId) {
        await this.updateConnectionTokens(
          workspaceId,
          tokenResponse.access_token,
          tokenResponse.refresh_token,
          expiresAt,
        );
      }

      this.logger.log(
        `Successfully refreshed Xero access token${workspaceId ? ` for workspace ${workspaceId}` : ''}`,
      );

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to refresh Xero access token${workspaceId ? ` for workspace ${workspaceId}` : ''}`,
        error.response?.data || error.message,
      );

      throw new CustomError(
        `Token refresh failed: ${error.response?.data?.error_description || error.message}`,
        XeroAuthExceptionCode.TOKEN_REFRESH_FAILED,
      );
    }
  }

  /**
   * Make a token request to Xero's token endpoint
   *
   * @param params - OAuth2 token request parameters
   * @returns Token response from Xero
   */
  private async requestTokens(
    params: Record<string, string>,
  ): Promise<XeroTokenResponse> {
    const response = await firstValueFrom(
      this.httpService.post<XeroTokenResponse>(
        this.tokenUrl,
        new URLSearchParams(params).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    return response.data;
  }

  /**
   * Fetch the list of Xero tenants/organizations the user has authorized
   *
   * @param accessToken - Valid access token
   * @returns Array of Xero tenant objects
   */
  private async fetchTenants(accessToken: string): Promise<XeroTenant[]> {
    const response = await firstValueFrom(
      this.httpService.get<XeroTenant[]>(this.connectionsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data;
  }

  /**
   * Update stored connection tokens in the database
   *
   * @param workspaceId - Workspace ID
   * @param accessToken - New access token
   * @param refreshToken - New refresh token
   * @param expiresAt - Token expiration timestamp
   */
  private async updateConnectionTokens(
    workspaceId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.xeroConnectionRepository.update(
      { workspaceId },
      {
        encryptedAccessToken: accessToken,
        encryptedRefreshToken: refreshToken,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Validate that OAuth credentials are configured
   *
   * @throws CustomError if credentials are missing
   */
  private validateCredentials(): void {
    if (!this.clientId || !this.clientSecret || !this.callbackUrl) {
      throw new CustomError(
        'Xero OAuth credentials not configured. Required environment variables: ' +
        'AUTH_XERO_CLIENT_ID, AUTH_XERO_CLIENT_SECRET, AUTH_XERO_CALLBACK_URL',
        XeroAuthExceptionCode.MISSING_CREDENTIALS,
      );
    }
  }

  /**
   * Decode and validate state parameter from OAuth callback
   *
   * @param encodedState - Base64url-encoded state parameter
   * @returns Decoded state object containing workspaceId and state
   * @throws CustomError if state is invalid or expired
   */
  decodeAndValidateState(encodedState: string): {
    workspaceId: string;
    state: string;
    timestamp: number;
  } {
    try {
      const decoded = Buffer.from(encodedState, 'base64url').toString('utf-8');
      const stateData = JSON.parse(decoded);

      // Validate state structure
      if (!stateData.workspaceId || !stateData.state || !stateData.timestamp) {
        throw new Error('Invalid state structure');
      }

      // Check if state is not older than 10 minutes (600000ms)
      const age = Date.now() - stateData.timestamp;
      if (age > 600000) {
        throw new Error('State parameter expired');
      }

      return stateData;
    } catch (error) {
      throw new CustomError(
        `Invalid state parameter: ${error.message}`,
        XeroAuthExceptionCode.INVALID_STATE,
      );
    }
  }

  /**
   * Revoke/disconnect a Xero connection
   *
   * This marks the connection as inactive. Note that Xero doesn't provide
   * a token revocation endpoint, so the tokens remain valid until they expire.
   * The best practice is to mark the connection as inactive in our database.
   *
   * @param workspaceId - Workspace ID to disconnect
   */
  async disconnectWorkspace(workspaceId: string): Promise<void> {
    await this.xeroConnectionRepository.update(
      { workspaceId },
      {
        isActive: false,
        updatedAt: new Date(),
      },
    );

    this.logger.log(`Disconnected Xero integration for workspace ${workspaceId}`);
  }

  /**
   * Get the active Xero connection for a workspace
   *
   * @param workspaceId - Workspace ID
   * @returns XeroConnectionEntity if found and active, null otherwise
   */
  async getConnection(
    workspaceId: string,
  ): Promise<XeroConnectionEntity | null> {
    return this.xeroConnectionRepository.findOne({
      where: { workspaceId, isActive: true },
    });
  }

  /**
   * Check if a workspace has an active Xero connection
   *
   * @param workspaceId - Workspace ID
   * @returns True if active connection exists, false otherwise
   */
  async isConnected(workspaceId: string): Promise<boolean> {
    const connection = await this.getConnection(workspaceId);
    return connection !== null;
  }
}
