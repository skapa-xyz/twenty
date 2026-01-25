import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CustomError } from 'twenty-shared/utils';

import { XeroConnectionEntity } from 'src/modules/xero-integration/entities/xero-connection.entity';

/**
 * Error codes specific to XeroClientService
 */
export enum XeroClientExceptionCode {
  CONNECTION_NOT_FOUND = 'CONNECTION_NOT_FOUND',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  INVALID_TENANT_ID = 'INVALID_TENANT_ID',
  REQUEST_FAILED = 'REQUEST_FAILED',
}

/**
 * XeroClientService - HTTP client wrapper for Xero API
 *
 * Provides a typed, workspace-aware HTTP client for making requests to the Xero API.
 * Handles authentication, automatic token refresh on 401 responses, and required
 * Xero headers (Authorization, Xero-tenant-id).
 *
 * Usage:
 * ```typescript
 * const contacts = await xeroClientService.get(workspaceId, '/Contacts');
 * const invoice = await xeroClientService.post(workspaceId, '/Invoices', invoiceData);
 * ```
 */
@Injectable()
export class XeroClientService {
  private readonly logger = new Logger(XeroClientService.name);
  private readonly baseUrl = 'https://api.xero.com/api.xro/2.0';

  // OAuth token endpoint for token refresh
  private readonly tokenUrl = 'https://identity.xero.com/connect/token';

  // Environment variables for OAuth credentials
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(XeroConnectionEntity)
    private readonly xeroConnectionRepository: Repository<XeroConnectionEntity>,
  ) {
    // Load OAuth credentials from environment
    this.clientId = process.env.XERO_CLIENT_ID || '';
    this.clientSecret = process.env.XERO_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'XERO_CLIENT_ID or XERO_CLIENT_SECRET not configured. Xero integration will not function.',
      );
    }
  }

  /**
   * Make a GET request to the Xero API
   *
   * @param workspaceId - The workspace ID for which to make the request
   * @param endpoint - The API endpoint (e.g., '/Contacts', '/Invoices')
   * @param config - Optional Axios request configuration
   * @returns The response data from Xero API
   */
  async get<T = unknown>(
    workspaceId: string,
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(workspaceId, 'GET', endpoint, undefined, config);
  }

  /**
   * Make a POST request to the Xero API
   *
   * @param workspaceId - The workspace ID for which to make the request
   * @param endpoint - The API endpoint (e.g., '/Invoices', '/Contacts')
   * @param data - The request body data
   * @param config - Optional Axios request configuration
   * @returns The response data from Xero API
   */
  async post<T = unknown>(
    workspaceId: string,
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(workspaceId, 'POST', endpoint, data, config);
  }

  /**
   * Make a PUT request to the Xero API
   *
   * @param workspaceId - The workspace ID for which to make the request
   * @param endpoint - The API endpoint (e.g., '/Invoices/{InvoiceID}')
   * @param data - The request body data
   * @param config - Optional Axios request configuration
   * @returns The response data from Xero API
   */
  async put<T = unknown>(
    workspaceId: string,
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(workspaceId, 'PUT', endpoint, data, config);
  }

  /**
   * Internal method to make HTTP requests to Xero API with automatic token refresh
   *
   * @param workspaceId - The workspace ID
   * @param method - HTTP method (GET, POST, PUT)
   * @param endpoint - API endpoint
   * @param data - Optional request body
   * @param config - Optional Axios configuration
   * @param isRetry - Internal flag to prevent infinite retry loops
   * @returns The response data
   */
  private async request<T>(
    workspaceId: string,
    method: 'GET' | 'POST' | 'PUT',
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig,
    isRetry = false,
  ): Promise<T> {
    // Fetch the connection details for this workspace
    const connection = await this.getConnection(workspaceId);

    // Ensure endpoint starts with '/'
    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;

    try {
      // Prepare headers with authorization and tenant ID
      const headers = await this.buildHeaders(connection);

      // Make the HTTP request
      const requestConfig: AxiosRequestConfig = {
        ...config,
        method,
        url,
        headers: {
          ...headers,
          ...(config?.headers || {}),
        },
        data,
      };

      this.logger.debug(
        `Making ${method} request to Xero: ${normalizedEndpoint}`,
      );

      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.request<T>(requestConfig),
      );

      return response.data;
    } catch (error) {
      // Handle 401 Unauthorized - token expired
      if (error.response?.status === 401 && !isRetry) {
        this.logger.log(
          `Received 401 from Xero API, refreshing token for workspace ${workspaceId}`,
        );

        // Refresh the access token
        await this.refreshAccessToken(connection);

        // Retry the request once with the new token
        return this.request<T>(
          workspaceId,
          method,
          endpoint,
          data,
          config,
          true,
        );
      }

      // Log and re-throw other errors
      this.logger.error(
        `Xero API request failed: ${method} ${normalizedEndpoint}`,
        error.response?.data || error.message,
      );

      throw new CustomError(
        `Xero API request failed: ${error.response?.data?.Message || error.message}`,
        XeroClientExceptionCode.REQUEST_FAILED,
      );
    }
  }

  /**
   * Build HTTP headers required for Xero API requests
   *
   * @param connection - The Xero connection entity
   * @returns Headers object with Authorization and Xero-tenant-id
   */
  private async buildHeaders(
    connection: XeroConnectionEntity,
  ): Promise<Record<string, string>> {
    if (!connection.tenantId) {
      throw new CustomError(
        'Xero tenant ID is required but not found on connection',
        XeroClientExceptionCode.INVALID_TENANT_ID,
      );
    }

    // Decrypt the access token (assuming XeroTokenService will handle this in the future)
    // For now, we store it as-is since encryption service may not be implemented yet
    const accessToken = connection.encryptedAccessToken;

    return {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': connection.tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Refresh the access token using the refresh token
   *
   * @param connection - The Xero connection entity
   */
  private async refreshAccessToken(
    connection: XeroConnectionEntity,
  ): Promise<void> {
    try {
      this.logger.log(
        `Refreshing Xero access token for workspace ${connection.workspaceId}`,
      );

      // Decrypt the refresh token
      const refreshToken = connection.encryptedRefreshToken;

      // Make OAuth token refresh request
      const response = await firstValueFrom(
        this.httpService.post(
          this.tokenUrl,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            },
          },
        ),
      );

      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
      } = response.data;

      // Calculate token expiration time
      const tokenExpiresAt = new Date();

      tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

      // Update the connection with new tokens
      // Note: In production, tokens should be encrypted via XeroTokenService
      await this.xeroConnectionRepository.update(connection.id, {
        encryptedAccessToken: newAccessToken,
        encryptedRefreshToken: newRefreshToken,
        tokenExpiresAt,
        updatedAt: new Date(),
      });

      // Update the in-memory connection object for the retry request
      connection.encryptedAccessToken = newAccessToken;
      connection.encryptedRefreshToken = newRefreshToken;
      connection.tokenExpiresAt = tokenExpiresAt;

      this.logger.log(
        `Successfully refreshed Xero token for workspace ${connection.workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh Xero token for workspace ${connection.workspaceId}`,
        error.response?.data || error.message,
      );

      throw new CustomError(
        'Failed to refresh Xero access token',
        XeroClientExceptionCode.TOKEN_REFRESH_FAILED,
      );
    }
  }

  /**
   * Fetch the Xero connection for a given workspace
   *
   * @param workspaceId - The workspace ID
   * @returns The Xero connection entity
   */
  private async getConnection(
    workspaceId: string,
  ): Promise<XeroConnectionEntity> {
    const connection = await this.xeroConnectionRepository.findOne({
      where: { workspaceId, isActive: true },
    });

    if (!connection) {
      throw new CustomError(
        `No active Xero connection found for workspace ${workspaceId}`,
        XeroClientExceptionCode.CONNECTION_NOT_FOUND,
      );
    }

    return connection;
  }
}
