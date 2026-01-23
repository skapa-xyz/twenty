import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { XeroConnectionEntity } from '../entities/xero-connection.entity';

/**
 * Interface representing Xero OAuth tokens and metadata.
 *
 * This structure contains all necessary information for making authenticated
 * requests to the Xero API, including access tokens, refresh tokens, and
 * associated metadata about the Xero tenant.
 */
export interface XeroTokens {
  /**
   * OAuth 2.0 access token for API authentication.
   * Short-lived token (typically expires in 30 minutes).
   */
  accessToken: string;

  /**
   * OAuth 2.0 refresh token for obtaining new access tokens.
   * Long-lived token (typically valid for 60 days).
   */
  refreshToken: string;

  /**
   * Timestamp when the access token expires.
   * Used to determine when a refresh is needed.
   */
  expiresAt: Date;

  /**
   * Xero organization/tenant ID.
   * Identifies which Xero organization the tokens are for.
   */
  tenantId?: string;

  /**
   * Human-readable name of the Xero organization.
   */
  tenantName?: string;

  /**
   * OAuth scopes granted for this connection.
   * Defines the permissions the integration has.
   */
  scopes?: string[];
}

/**
 * Service for managing Xero OAuth tokens with AES-256-GCM encryption.
 *
 * This service provides secure storage and retrieval of Xero OAuth tokens
 * using AES-256-GCM encryption. It handles encryption/decryption, token
 * storage in the database, and token lifecycle management.
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Random initialization vectors (IV) for each encryption
 * - Authentication tags for data integrity verification
 * - Secure key management via environment variables
 *
 * @example
 * ```typescript
 * // Save tokens after OAuth flow
 * await xeroTokenService.saveTokens(workspaceId, {
 *   accessToken: 'xxx',
 *   refreshToken: 'yyy',
 *   expiresAt: new Date(Date.now() + 30 * 60 * 1000),
 *   tenantId: 'tenant-id',
 *   tenantName: 'My Organization',
 *   scopes: ['accounting.transactions', 'accounting.contacts']
 * });
 *
 * // Retrieve tokens for API calls
 * const tokens = await xeroTokenService.getTokens(workspaceId);
 * ```
 */
@Injectable()
export class XeroTokenService {
  private readonly logger = new Logger(XeroTokenService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer | null;
  private readonly isConfigured: boolean;

  constructor(
    @InjectRepository(XeroConnectionEntity)
    private readonly connectionRepository: Repository<XeroConnectionEntity>,
  ) {
    const key = process.env.XERO_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
      this.logger.warn(
        'XERO_ENCRYPTION_KEY not configured or invalid. Xero token encryption will not function. ' +
          'Set a 64-character hex string (32 bytes) to enable Xero integration.',
      );
      this.encryptionKey = null;
      this.isConfigured = false;
    } else {
      this.encryptionKey = Buffer.from(key, 'hex');
      this.isConfigured = true;
    }
  }

  /**
   * Check if the Xero integration is properly configured.
   * @returns true if XERO_ENCRYPTION_KEY is set
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Validate that the service is configured before operations
   * @throws Error if encryption key is not configured
   */
  private validateConfigured(): void {
    if (!this.isConfigured || !this.encryptionKey) {
      throw new Error(
        'Xero integration is not configured. Set XERO_ENCRYPTION_KEY environment variable.',
      );
    }
  }

  /**
   * Encrypts a token using AES-256-GCM.
   *
   * The encryption process:
   * 1. Generates a random 16-byte initialization vector (IV)
   * 2. Creates a cipher with AES-256-GCM algorithm
   * 3. Encrypts the plaintext token
   * 4. Extracts the authentication tag for integrity verification
   * 5. Returns a formatted string: iv:authTag:encrypted
   *
   * @param text - The plaintext token to encrypt
   * @returns Encrypted string in format "iv:authTag:ciphertext" (all hex-encoded)
   * @private
   */
  private encrypt(text: string): string {
    this.validateConfigured();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey!,
      iv,
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts a token encrypted with AES-256-GCM.
   *
   * The decryption process:
   * 1. Parses the encrypted string to extract IV, auth tag, and ciphertext
   * 2. Creates a decipher with AES-256-GCM algorithm
   * 3. Sets the authentication tag for integrity verification
   * 4. Decrypts the ciphertext
   * 5. Returns the original plaintext token
   *
   * @param encryptedData - Encrypted string in format "iv:authTag:ciphertext"
   * @returns Decrypted plaintext token
   * @throws Error if authentication tag verification fails (data tampering detected)
   * @private
   */
  private decrypt(encryptedData: string): string {
    this.validateConfigured();
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey!,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Saves or updates Xero OAuth tokens for a workspace.
   *
   * This method encrypts the access and refresh tokens before storing them
   * in the database. If a connection already exists for the workspace, it
   * updates the existing record; otherwise, it creates a new one.
   *
   * The method preserves existing metadata (tenantId, tenantName, scopes)
   * if not provided in the new tokens, allowing partial updates.
   *
   * @param workspaceId - UUID of the workspace
   * @param tokens - OAuth tokens and metadata to save
   * @returns The saved XeroConnectionEntity
   * @throws Error if encryption fails or database operation fails
   *
   * @example
   * ```typescript
   * const connection = await xeroTokenService.saveTokens(workspaceId, {
   *   accessToken: 'new-access-token',
   *   refreshToken: 'new-refresh-token',
   *   expiresAt: new Date(Date.now() + 1800000),
   *   tenantId: 'xero-tenant-id',
   *   tenantName: 'ACME Corp',
   *   scopes: ['accounting.transactions']
   * });
   * ```
   */
  async saveTokens(
    workspaceId: string,
    tokens: XeroTokens,
  ): Promise<XeroConnectionEntity> {
    let connection = await this.connectionRepository.findOne({
      where: { workspaceId },
    });

    const encryptedAccessToken = this.encrypt(tokens.accessToken);
    const encryptedRefreshToken = this.encrypt(tokens.refreshToken);

    if (connection) {
      connection.encryptedAccessToken = encryptedAccessToken;
      connection.encryptedRefreshToken = encryptedRefreshToken;
      connection.tokenExpiresAt = tokens.expiresAt;
      connection.tenantId = tokens.tenantId ?? connection.tenantId;
      connection.tenantName = tokens.tenantName ?? connection.tenantName;
      connection.scopes = tokens.scopes ?? connection.scopes;
      connection.isActive = true;
    } else {
      connection = this.connectionRepository.create({
        workspaceId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        tenantId: tokens.tenantId,
        tenantName: tokens.tenantName,
        scopes: tokens.scopes ?? [],
        isActive: true,
      });
    }

    return this.connectionRepository.save(connection);
  }

  /**
   * Retrieves and decrypts Xero OAuth tokens for a workspace.
   *
   * This method fetches the active Xero connection for a workspace and
   * decrypts the stored access and refresh tokens. Only active connections
   * are returned.
   *
   * @param workspaceId - UUID of the workspace
   * @returns Decrypted tokens and metadata, or null if no active connection exists
   * @throws Error if decryption fails (e.g., due to corrupted data or wrong key)
   *
   * @example
   * ```typescript
   * const tokens = await xeroTokenService.getTokens(workspaceId);
   * if (tokens) {
   *   // Use tokens.accessToken for API calls
   *   const response = await xeroApi.get('/invoices', {
   *     headers: { Authorization: `Bearer ${tokens.accessToken}` }
   *   });
   * }
   * ```
   */
  async getTokens(workspaceId: string): Promise<XeroTokens | null> {
    const connection = await this.connectionRepository.findOne({
      where: { workspaceId, isActive: true },
    });

    if (!connection) {
      return null;
    }

    return {
      accessToken: this.decrypt(connection.encryptedAccessToken),
      refreshToken: this.decrypt(connection.encryptedRefreshToken),
      expiresAt: connection.tokenExpiresAt,
      tenantId: connection.tenantId ?? undefined,
      tenantName: connection.tenantName ?? undefined,
      scopes: connection.scopes,
    };
  }

  /**
   * Retrieves all active Xero connections with tokens expiring before a given date.
   *
   * This method is useful for proactive token refresh jobs that need to
   * identify connections requiring token renewal before they expire.
   *
   * @param date - The cutoff date; returns connections expiring before this date
   * @returns Array of XeroConnectionEntity objects with encrypted tokens
   *
   * @example
   * ```typescript
   * // Find connections expiring in the next 5 minutes
   * const expiringConnections = await xeroTokenService.getConnectionsExpiringBefore(
   *   new Date(Date.now() + 5 * 60 * 1000)
   * );
   *
   * // Refresh tokens for each expiring connection
   * for (const connection of expiringConnections) {
   *   await refreshTokensForConnection(connection);
   * }
   * ```
   */
  async getConnectionsExpiringBefore(
    date: Date,
  ): Promise<XeroConnectionEntity[]> {
    return this.connectionRepository
      .createQueryBuilder('conn')
      .where('conn.isActive = true')
      .andWhere('conn.tokenExpiresAt < :date', { date })
      .getMany();
  }

  /**
   * Marks a Xero connection as disconnected (inactive).
   *
   * This method sets the isActive flag to false, preventing the connection
   * from being used for API calls. The connection record is preserved for
   * audit purposes but will not be returned by getTokens().
   *
   * Typical use cases:
   * - User manually disconnects their Xero account
   * - OAuth refresh fails (revoked access)
   * - Connection is no longer needed
   *
   * @param workspaceId - UUID of the workspace
   * @returns Promise that resolves when the update is complete
   *
   * @example
   * ```typescript
   * // User disconnects their Xero account
   * await xeroTokenService.markDisconnected(workspaceId);
   * ```
   */
  async markDisconnected(workspaceId: string): Promise<void> {
    await this.connectionRepository.update(
      { workspaceId },
      { isActive: false },
    );
  }
}
