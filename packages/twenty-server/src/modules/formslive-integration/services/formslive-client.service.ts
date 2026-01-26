import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CustomError } from 'twenty-shared/utils';

import { FormsLiveTokenService } from 'src/modules/formslive-integration/services/formslive-token.service';
import {
  AustralianState,
  FormsLiveConnectionEntity,
} from 'src/modules/formslive-integration/entities/formslive-connection.entity';
import { FormsLiveExceptionCode } from 'src/modules/formslive-integration/types/formslive.types';

/**
 * FormsLive API Client Service
 *
 * Provides a typed, user-aware HTTP client for making requests to the FormsLive API.
 * Key features:
 * - State-based API endpoint routing (QLD, NSW, VIC, etc.)
 * - Per-user authentication using API key + access token
 * - Automatic error handling with custom exception codes
 *
 * FormsLive uses Basic authentication with the format:
 * Authorization: Basic base64(API_KEY:ACCESS_TOKEN)
 *
 * @example
 * ```typescript
 * // Get templates for a user
 * const templates = await formsLiveClientService.get(userId, workspaceId, '/templates/');
 *
 * // Create a form from a template
 * const form = await formsLiveClientService.post(userId, workspaceId, '/forms/', {
 *   name: 'Engagement Agreement - John Smith',
 *   template_id: 12345,
 * });
 * ```
 */
@Injectable()
export class FormsLiveClientService {
  private readonly logger = new Logger(FormsLiveClientService.name);
  private readonly apiKey: string;
  private readonly isConfigured: boolean;

  /**
   * State-based API endpoints for FormsLive.
   * Each Australian state has its own API endpoint.
   */
  private readonly stateEndpoints: Record<AustralianState, string> = {
    QLD: 'https://qld.api.formslive.com.au',
    NSW: 'https://nsw.api.formslive.com.au',
    VIC: 'https://vic.api.formslive.com.au',
    SA: 'https://sa.api.formslive.com.au',
    WA: 'https://wa.api.formslive.com.au',
    TAS: 'https://tas.api.formslive.com.au',
    NT: 'https://nt.api.formslive.com.au',
    ACT: 'https://act.api.formslive.com.au',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenService: FormsLiveTokenService,
  ) {
    const apiKey = process.env.FORMSLIVE_API_KEY;

    if (!apiKey) {
      this.logger.warn(
        'FORMSLIVE_API_KEY not configured. FormsLive integration will not function.',
      );
      this.apiKey = '';
      this.isConfigured = false;
    } else {
      this.apiKey = apiKey;
      this.isConfigured = true;
    }
  }

  /**
   * Check if the FormsLive client is properly configured.
   * @returns true if API key is set
   */
  isEnabled(): boolean {
    return this.isConfigured && this.tokenService.isEnabled();
  }

  /**
   * Make a GET request to the FormsLive API.
   *
   * @param userId - The user ID for authentication
   * @param workspaceId - The workspace ID
   * @param endpoint - The API endpoint (e.g., '/templates/')
   * @param config - Optional Axios request configuration
   * @returns The response data from FormsLive API
   */
  async get<T = unknown>(
    userId: string,
    workspaceId: string,
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(
      userId,
      workspaceId,
      'GET',
      endpoint,
      undefined,
      config,
    );
  }

  /**
   * Make a POST request to the FormsLive API.
   *
   * @param userId - The user ID for authentication
   * @param workspaceId - The workspace ID
   * @param endpoint - The API endpoint (e.g., '/forms/')
   * @param data - The request body data
   * @param config - Optional Axios request configuration
   * @returns The response data from FormsLive API
   */
  async post<T = unknown>(
    userId: string,
    workspaceId: string,
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(userId, workspaceId, 'POST', endpoint, data, config);
  }

  /**
   * Make a PUT request to the FormsLive API.
   *
   * @param userId - The user ID for authentication
   * @param workspaceId - The workspace ID
   * @param endpoint - The API endpoint
   * @param data - The request body data
   * @param config - Optional Axios request configuration
   * @returns The response data from FormsLive API
   */
  async put<T = unknown>(
    userId: string,
    workspaceId: string,
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(userId, workspaceId, 'PUT', endpoint, data, config);
  }

  /**
   * Make a DELETE request to the FormsLive API.
   *
   * @param userId - The user ID for authentication
   * @param workspaceId - The workspace ID
   * @param endpoint - The API endpoint
   * @param config - Optional Axios request configuration
   * @returns The response data from FormsLive API
   */
  async delete<T = unknown>(
    userId: string,
    workspaceId: string,
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(
      userId,
      workspaceId,
      'DELETE',
      endpoint,
      undefined,
      config,
    );
  }

  /**
   * Internal method to make HTTP requests to FormsLive API.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param method - HTTP method (GET, POST, PUT, DELETE)
   * @param endpoint - API endpoint
   * @param data - Optional request body
   * @param config - Optional Axios configuration
   * @returns The response data
   */
  private async request<T>(
    userId: string,
    workspaceId: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    // Fetch the connection details for this user
    const connection = await this.getConnection(userId, workspaceId);

    // Get the state-specific base URL
    const baseUrl = this.stateEndpoints[connection.australianState];

    // Ensure endpoint starts with '/'
    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;
    const url = `${baseUrl}${normalizedEndpoint}`;

    try {
      // Get decrypted access token and build authorization header
      const accessToken = await this.tokenService.getDecryptedToken(
        userId,
        workspaceId,
      );

      if (!accessToken) {
        throw new CustomError(
          `No access token found for user ${userId}`,
          'TOKEN_INVALID' as FormsLiveExceptionCode,
        );
      }

      // Build Basic auth header: base64(API_KEY:ACCESS_TOKEN)
      const authString = Buffer.from(`${this.apiKey}:${accessToken}`).toString(
        'base64',
      );

      const requestConfig: AxiosRequestConfig = {
        ...config,
        method,
        url,
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(config?.headers ?? {}),
        },
        data,
      };

      this.logger.debug(
        `Making ${method} request to FormsLive (${connection.australianState}): ${normalizedEndpoint}`,
      );

      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.request<T>(requestConfig),
      );

      return response.data;
    } catch (error) {
      // Handle specific error responses
      if (error.response?.status === 401) {
        this.logger.error(
          `FormsLive authentication failed for user ${userId}. Token may be invalid.`,
        );

        throw new CustomError(
          'FormsLive authentication failed. Please reconnect your account.',
          'TOKEN_INVALID' as FormsLiveExceptionCode,
        );
      }

      // Log and re-throw other errors
      this.logger.error(
        `FormsLive API request failed: ${method} ${normalizedEndpoint}`,
        error.response?.data ?? error.message,
      );

      throw new CustomError(
        `FormsLive API request failed: ${error.response?.data?.message ?? error.message}`,
        'API_REQUEST_FAILED' as FormsLiveExceptionCode,
      );
    }
  }

  /**
   * Fetch the FormsLive connection for a given user.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @returns The FormsLive connection entity
   */
  private async getConnection(
    userId: string,
    workspaceId: string,
  ): Promise<FormsLiveConnectionEntity> {
    const connection = await this.tokenService.getConnection(
      userId,
      workspaceId,
    );

    if (!connection) {
      throw new CustomError(
        `No active FormsLive connection found for user ${userId}`,
        'CONNECTION_NOT_FOUND' as FormsLiveExceptionCode,
      );
    }

    return connection;
  }
}
