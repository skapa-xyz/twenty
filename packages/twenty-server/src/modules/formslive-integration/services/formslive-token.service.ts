import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as crypto from 'crypto';

import { Repository } from 'typeorm';
import { CustomError } from 'twenty-shared/utils';

import {
  FormsLiveConnectionEntity,
  AustralianState,
} from 'src/modules/formslive-integration/entities/formslive-connection.entity';
import { FormsLiveExceptionCode } from 'src/modules/formslive-integration/types/formslive.types';

/**
 * Service for managing FormsLive access tokens with AES-256-GCM encryption.
 *
 * This service provides secure storage and retrieval of FormsLive access tokens
 * using AES-256-GCM encryption. Unlike Xero, FormsLive uses a simpler auth model
 * without refresh tokens - just API key + access token.
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Random initialization vectors (IV) for each encryption
 * - Authentication tags for data integrity verification
 * - Secure key management via environment variables
 *
 * The encryption key can be shared with Xero or use a dedicated key.
 * Set FORMSLIVE_ENCRYPTION_KEY or fall back to XERO_ENCRYPTION_KEY.
 *
 * @example
 * ```typescript
 * // Save connection after authentication
 * await formsLiveTokenService.saveConnection(userId, workspaceId, {
 *   accessToken: 'xxx',
 *   australianState: 'QLD',
 *   formsLiveUserId: '12345',
 *   agencyName: 'Buyers Agency Co',
 * });
 *
 * // Retrieve connection for API calls
 * const connection = await formsLiveTokenService.getConnection(userId, workspaceId);
 * ```
 */
@Injectable()
export class FormsLiveTokenService {
  private readonly logger = new Logger(FormsLiveTokenService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer | null;
  private readonly isConfigured: boolean;

  constructor(
    @InjectRepository(FormsLiveConnectionEntity)
    private readonly connectionRepository: Repository<FormsLiveConnectionEntity>,
  ) {
    // Use dedicated key or share with Xero
    const key =
      process.env.FORMSLIVE_ENCRYPTION_KEY || process.env.XERO_ENCRYPTION_KEY;

    if (!key || key.length !== 64) {
      this.logger.warn(
        'FORMSLIVE_ENCRYPTION_KEY not configured or invalid. FormsLive token encryption will not function. ' +
          'Set a 64-character hex string (32 bytes) to enable FormsLive integration.',
      );
      this.encryptionKey = null;
      this.isConfigured = false;
    } else {
      this.encryptionKey = Buffer.from(key, 'hex');
      this.isConfigured = true;
    }
  }

  /**
   * Check if the FormsLive integration is properly configured.
   * @returns true if encryption key is set
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Validate that the service is configured before operations
   * @throws CustomError if encryption key is not configured
   */
  private validateConfigured(): void {
    if (!this.isConfigured || !this.encryptionKey) {
      throw new CustomError(
        'FormsLive integration is not configured. Set FORMSLIVE_ENCRYPTION_KEY environment variable.',
        'ENCRYPTION_NOT_CONFIGURED' as FormsLiveExceptionCode,
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
   * Saves or updates a FormsLive connection for a user.
   *
   * This method encrypts the access token before storing it in the database.
   * If a connection already exists for the user/workspace, it updates the
   * existing record; otherwise, it creates a new one.
   *
   * @param userId - UUID of the user
   * @param workspaceId - UUID of the workspace
   * @param data - Connection data to save
   * @returns The saved FormsLiveConnectionEntity
   */
  async saveConnection(
    userId: string,
    workspaceId: string,
    data: {
      accessToken: string;
      australianState: AustralianState;
      formsLiveUserId?: string;
      agencyName?: string;
    },
  ): Promise<FormsLiveConnectionEntity> {
    let connection = await this.connectionRepository.findOne({
      where: { userId, workspaceId },
    });

    const encryptedAccessToken = this.encrypt(data.accessToken);

    if (connection) {
      connection.encryptedAccessToken = encryptedAccessToken;
      connection.australianState = data.australianState;
      connection.formsLiveUserId =
        data.formsLiveUserId ?? connection.formsLiveUserId;
      connection.agencyName = data.agencyName ?? connection.agencyName;
      connection.isActive = true;
    } else {
      connection = this.connectionRepository.create({
        userId,
        workspaceId,
        encryptedAccessToken,
        australianState: data.australianState,
        formsLiveUserId: data.formsLiveUserId,
        agencyName: data.agencyName,
        isActive: true,
      });
    }

    return this.connectionRepository.save(connection);
  }

  /**
   * Retrieves an active FormsLive connection for a user.
   *
   * @param userId - UUID of the user
   * @param workspaceId - UUID of the workspace
   * @returns The connection entity or null if not found
   */
  async getConnection(
    userId: string,
    workspaceId: string,
  ): Promise<FormsLiveConnectionEntity | null> {
    return this.connectionRepository.findOne({
      where: { userId, workspaceId, isActive: true },
    });
  }

  /**
   * Retrieves the decrypted access token for a user.
   *
   * @param userId - UUID of the user
   * @param workspaceId - UUID of the workspace
   * @returns Decrypted access token or null if no active connection
   */
  async getDecryptedToken(
    userId: string,
    workspaceId: string,
  ): Promise<string | null> {
    const connection = await this.getConnection(userId, workspaceId);

    if (!connection) {
      return null;
    }

    return this.decrypt(connection.encryptedAccessToken);
  }

  /**
   * Updates the Australian state for a user's connection.
   *
   * @param userId - UUID of the user
   * @param workspaceId - UUID of the workspace
   * @param state - New Australian state
   */
  async updateState(
    userId: string,
    workspaceId: string,
    state: AustralianState,
  ): Promise<void> {
    await this.connectionRepository.update(
      { userId, workspaceId },
      { australianState: state },
    );
  }

  /**
   * Updates the selected engagement template for a user's connection.
   *
   * @param userId - UUID of the user
   * @param workspaceId - UUID of the workspace
   * @param templateId - FormsLive template ID
   * @param templateName - Template name for display
   */
  async updateEngagementTemplate(
    userId: string,
    workspaceId: string,
    templateId: number,
    templateName: string,
  ): Promise<void> {
    await this.connectionRepository.update(
      { userId, workspaceId },
      {
        engagementTemplateId: templateId,
        engagementTemplateName: templateName,
      },
    );
  }

  /**
   * Marks a FormsLive connection as disconnected (inactive).
   *
   * @param userId - UUID of the user
   * @param workspaceId - UUID of the workspace
   */
  async markDisconnected(userId: string, workspaceId: string): Promise<void> {
    await this.connectionRepository.update(
      { userId, workspaceId },
      { isActive: false },
    );
  }

  /**
   * Stores webhook IDs for a connection.
   *
   * @param userId - UUID of the user
   * @param workspaceId - UUID of the workspace
   * @param webhookIds - Map of webhook types to their FormsLive IDs
   */
  async updateWebhookIds(
    userId: string,
    workspaceId: string,
    webhookIds: Record<string, number>,
  ): Promise<void> {
    await this.connectionRepository.update(
      { userId, workspaceId },
      { webhookIds },
    );
  }
}
