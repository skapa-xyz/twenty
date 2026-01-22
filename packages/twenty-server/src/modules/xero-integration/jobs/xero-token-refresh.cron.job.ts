import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { XeroConnectionEntity } from '../entities/xero-connection.entity';
import { XeroTokenService } from '../services/xero-token.service';

/**
 * Cron pattern for Xero token refresh job.
 * Runs every 30 minutes to proactively refresh tokens before they expire.
 */
export const XERO_TOKEN_REFRESH_CRON_PATTERN = '*/30 * * * *';

/**
 * Proactive token refresh window in minutes.
 * Tokens expiring within this window will be refreshed.
 */
const TOKEN_REFRESH_WINDOW_MINUTES = 10;

/**
 * XeroTokenRefreshCronJob - Proactive OAuth token refresh for Xero connections
 *
 * This cron job runs every 30 minutes to proactively refresh OAuth access tokens
 * for active Xero connections before they expire. By refreshing tokens ahead of
 * expiration, we prevent API call failures due to expired tokens.
 *
 * The job:
 * 1. Finds all active Xero connections with tokens expiring in the next 10 minutes
 * 2. Refreshes the access token using the refresh token via Xero OAuth endpoint
 * 3. Updates the stored encrypted tokens and expiration time
 * 4. Logs all refresh activity and errors for monitoring
 *
 * Token refresh failures are logged but don't halt the job - each connection
 * is processed independently to ensure one failure doesn't affect others.
 *
 * @example
 * Manual execution (for testing):
 * ```typescript
 * const job = app.get(XeroTokenRefreshCronJob);
 * await job.handle();
 * ```
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class XeroTokenRefreshCronJob {
  private readonly logger = new Logger(XeroTokenRefreshCronJob.name);

  // OAuth token endpoint for token refresh
  private readonly tokenUrl = 'https://identity.xero.com/connect/token';

  // Environment variables for OAuth credentials
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    @InjectRepository(XeroConnectionEntity, 'core')
    private readonly xeroConnectionRepository: Repository<XeroConnectionEntity>,
    private readonly xeroTokenService: XeroTokenService,
    private readonly httpService: HttpService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
  ) {
    // Load OAuth credentials from environment
    this.clientId = process.env.XERO_CLIENT_ID || '';
    this.clientSecret = process.env.XERO_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'XERO_CLIENT_ID or XERO_CLIENT_SECRET not configured. Xero token refresh will not function.',
      );
    }
  }

  /**
   * Main cron job handler - refreshes expiring Xero tokens
   *
   * This method runs on the configured schedule (every 30 minutes by default)
   * and identifies all active Xero connections with tokens expiring soon,
   * then proactively refreshes them.
   */
  @Process(XeroTokenRefreshCronJob.name)
  @SentryCronMonitor(
    XeroTokenRefreshCronJob.name,
    XERO_TOKEN_REFRESH_CRON_PATTERN,
  )
  async handle(): Promise<void> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'Skipping Xero token refresh - OAuth credentials not configured',
      );
      return;
    }

    // Calculate the cutoff time: current time + refresh window
    const refreshCutoffTime = new Date();
    refreshCutoffTime.setMinutes(
      refreshCutoffTime.getMinutes() + TOKEN_REFRESH_WINDOW_MINUTES,
    );

    this.logger.log(
      `Starting Xero token refresh job. Refreshing tokens expiring before ${refreshCutoffTime.toISOString()}`,
    );

    // Find all connections with tokens expiring within the refresh window
    const expiringConnections =
      await this.xeroTokenService.getConnectionsExpiringBefore(
        refreshCutoffTime,
      );

    if (expiringConnections.length === 0) {
      this.logger.log('No Xero tokens require refresh at this time');
      return;
    }

    this.logger.log(
      `Found ${expiringConnections.length} Xero connection(s) with tokens expiring soon`,
    );

    // Refresh tokens for each expiring connection
    let successCount = 0;
    let failureCount = 0;

    for (const connection of expiringConnections) {
      try {
        await this.refreshConnectionToken(connection);
        successCount++;
      } catch (error) {
        failureCount++;
        // Log the error but continue processing other connections
        this.exceptionHandlerService.captureExceptions([error], {
          extra: {
            workspaceId: connection.workspaceId,
            tenantId: connection.tenantId,
            tokenExpiresAt: connection.tokenExpiresAt,
          },
        });
        this.logger.error(
          `Failed to refresh Xero token for workspace ${connection.workspaceId}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Xero token refresh completed. Successful: ${successCount}, Failed: ${failureCount}`,
    );
  }

  /**
   * Refreshes the OAuth token for a single Xero connection
   *
   * Makes a request to Xero's OAuth token endpoint using the refresh token
   * to obtain a new access token and refresh token. Updates the connection
   * record with the new encrypted tokens and expiration time.
   *
   * @param connection - The XeroConnectionEntity to refresh
   * @throws Error if token refresh request fails or tokens cannot be saved
   */
  private async refreshConnectionToken(
    connection: XeroConnectionEntity,
  ): Promise<void> {
    this.logger.log(
      `Refreshing Xero token for workspace ${connection.workspaceId} (expires at ${connection.tokenExpiresAt.toISOString()})`,
    );

    // Decrypt the current refresh token
    const tokens = await this.xeroTokenService.getTokens(
      connection.workspaceId,
    );

    if (!tokens) {
      throw new Error(
        `Cannot retrieve tokens for workspace ${connection.workspaceId}`,
      );
    }

    try {
      // Make OAuth token refresh request to Xero
      const response = await firstValueFrom(
        this.httpService.post(
          this.tokenUrl,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            },
          },
        ),
      );

      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
      } = response.data;

      // Calculate new token expiration time
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

      // Save the new encrypted tokens via XeroTokenService
      await this.xeroTokenService.saveTokens(connection.workspaceId, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: tokenExpiresAt,
        tenantId: connection.tenantId ?? undefined,
        tenantName: connection.tenantName ?? undefined,
        scopes: connection.scopes,
      });

      this.logger.log(
        `Successfully refreshed Xero token for workspace ${connection.workspaceId}. New expiration: ${tokenExpiresAt.toISOString()}`,
      );
    } catch (error) {
      // Handle specific OAuth errors
      const errorData = error.response?.data;
      const errorMessage = errorData?.error_description || error.message;

      this.logger.error(
        `Xero OAuth token refresh failed for workspace ${connection.workspaceId}: ${errorMessage}`,
        error.stack,
      );

      // If refresh token is invalid/revoked, mark the connection as inactive
      if (
        errorData?.error === 'invalid_grant' ||
        error.response?.status === 401
      ) {
        this.logger.warn(
          `Refresh token invalid or revoked for workspace ${connection.workspaceId}. Marking connection as inactive.`,
        );
        await this.xeroTokenService.markDisconnected(connection.workspaceId);
      }

      throw error;
    }
  }
}
