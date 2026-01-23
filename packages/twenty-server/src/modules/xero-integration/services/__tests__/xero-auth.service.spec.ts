import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

import {
  XeroAuthService,
  XeroAuthExceptionCode,
  XeroTokenResponse,
  XeroTenant,
} from '../xero-auth.service';
import { XeroConnectionEntity } from '../../entities/xero-connection.entity';
import { CustomError } from 'twenty-shared/utils';

describe('XeroAuthService', () => {
  let service: XeroAuthService;
  let httpService: HttpService;
  let xeroConnectionRepository: Repository<XeroConnectionEntity>;

  const mockEnv = {
    XERO_CLIENT_ID: 'test-client-id',
    XERO_CLIENT_SECRET: 'test-client-secret',
    XERO_REDIRECT_URI: 'https://test.com/callback',
  };

  beforeEach(async () => {
    // Set environment variables (using standardized XERO_* names)
    process.env.XERO_CLIENT_ID = mockEnv.XERO_CLIENT_ID;
    process.env.XERO_CLIENT_SECRET = mockEnv.XERO_CLIENT_SECRET;
    process.env.XERO_REDIRECT_URI = mockEnv.XERO_REDIRECT_URI;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroAuthService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(XeroConnectionEntity, 'core'),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<XeroAuthService>(XeroAuthService);
    httpService = module.get<HttpService>(HttpService);
    xeroConnectionRepository = module.get<Repository<XeroConnectionEntity>>(
      getRepositoryToken(XeroConnectionEntity, 'core'),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePKCEPair', () => {
    it('should generate valid code verifier and challenge', () => {
      const { codeVerifier, codeChallenge } = service.generatePKCEPair();

      // Code verifier should be at least 43 characters
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(codeVerifier.length).toBeLessThanOrEqual(128);

      // Code verifier should only contain URL-safe characters
      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);

      // Code challenge should be base64url encoded (no padding)
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(codeChallenge).not.toContain('=');

      // Code challenge should be different from code verifier
      expect(codeChallenge).not.toBe(codeVerifier);
    });

    it('should generate unique code verifiers each time', () => {
      const pair1 = service.generatePKCEPair();
      const pair2 = service.generatePKCEPair();

      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
      expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL with PKCE parameters', async () => {
      const workspaceId = 'test-workspace-id';

      const result = await service.getAuthorizationUrl(workspaceId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('codeVerifier');
      expect(result).toHaveProperty('state');

      // Validate URL structure
      const url = new URL(result.url);
      expect(url.hostname).toBe('login.xero.com');
      expect(url.pathname).toBe('/identity/connect/authorize');

      // Validate query parameters
      const params = url.searchParams;
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe(mockEnv.XERO_CLIENT_ID);
      expect(params.get('redirect_uri')).toBe(mockEnv.XERO_REDIRECT_URI);
      expect(params.get('code_challenge_method')).toBe('S256');
      expect(params.get('code_challenge')).toBeTruthy();
      expect(params.get('state')).toBeTruthy();

      // Validate scopes
      const scopes = params.get('scope');
      expect(scopes).toContain('offline_access');
      expect(scopes).toContain('accounting.transactions');
    });

    it('should include workspace ID in encoded state', async () => {
      const workspaceId = 'test-workspace-id';

      const result = await service.getAuthorizationUrl(workspaceId);

      const url = new URL(result.url);
      const encodedState = url.searchParams.get('state');
      expect(encodedState).toBeTruthy();

      // Decode state
      const decodedState = service.decodeAndValidateState(encodedState!);
      expect(decodedState.workspaceId).toBe(workspaceId);
      expect(decodedState.state).toBe(result.state);
    });

    it('should use provided state if given', async () => {
      const workspaceId = 'test-workspace-id';
      const customState = 'custom-state-123';

      const result = await service.getAuthorizationUrl(
        workspaceId,
        customState,
      );

      expect(result.state).toBe(customState);
    });

    it('should throw error if credentials are missing', async () => {
      // Clear environment variables
      delete process.env.XERO_CLIENT_ID;

      // Create new service instance without credentials
      const moduleWithoutCreds = await Test.createTestingModule({
        providers: [
          XeroAuthService,
          {
            provide: HttpService,
            useValue: { post: jest.fn(), get: jest.fn() },
          },
          {
            provide: getRepositoryToken(XeroConnectionEntity, 'core'),
            useValue: { findOne: jest.fn() },
          },
        ],
      }).compile();

      const serviceWithoutCreds =
        moduleWithoutCreds.get<XeroAuthService>(XeroAuthService);

      await expect(
        serviceWithoutCreds.getAuthorizationUrl('test-workspace'),
      ).rejects.toThrow(CustomError);

      // Restore env vars
      process.env.XERO_CLIENT_ID = mockEnv.XERO_CLIENT_ID;
    });
  });

  describe('exchangeCodeForTokens', () => {
    const mockTokenResponse: XeroTokenResponse = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 1800,
      token_type: 'Bearer',
      scope: 'offline_access accounting.transactions',
    };

    const mockTenants: XeroTenant[] = [
      {
        id: 'tenant-1',
        tenantId: 'xero-tenant-id-1',
        tenantType: 'ORGANISATION',
        tenantName: 'Test Organization',
      },
    ];

    it('should successfully exchange code for tokens and create connection', async () => {
      const code = 'auth-code-123';
      const codeVerifier = 'a'.repeat(43); // Valid code verifier
      const workspaceId = 'test-workspace-id';

      // Mock HTTP responses
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: mockTokenResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockTenants,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      // Mock repository methods
      jest.spyOn(xeroConnectionRepository, 'findOne').mockResolvedValue(null);
      const mockCreatedEntity = {
        id: 'connection-id',
        workspaceId,
        tenantId: mockTenants[0].tenantId,
        tenantName: mockTenants[0].tenantName,
      } as XeroConnectionEntity;

      jest
        .spyOn(xeroConnectionRepository, 'create')
        .mockReturnValue(mockCreatedEntity);
      jest
        .spyOn(xeroConnectionRepository, 'save')
        .mockResolvedValue(mockCreatedEntity);

      const result = await service.exchangeCodeForTokens(
        code,
        codeVerifier,
        workspaceId,
      );

      expect(result).toBeDefined();
      expect(result.tenantId).toBe(mockTenants[0].tenantId);
      expect(result.tenantName).toBe(mockTenants[0].tenantName);

      // Verify token endpoint was called correctly
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('identity.xero.com/connect/token'),
        expect.stringContaining('authorization_code'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      // Verify tenants endpoint was called
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('api.xero.com/connections'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockTokenResponse.access_token}`,
          }),
        }),
      );
    });

    it('should update existing connection if one exists', async () => {
      const code = 'auth-code-123';
      const codeVerifier = 'a'.repeat(43);
      const workspaceId = 'test-workspace-id';

      const existingConnection = {
        id: 'existing-connection-id',
        workspaceId,
        tenantId: 'old-tenant-id',
        isActive: false,
      } as XeroConnectionEntity;

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: mockTokenResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockTenants,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      jest
        .spyOn(xeroConnectionRepository, 'findOne')
        .mockResolvedValue(existingConnection);
      jest
        .spyOn(xeroConnectionRepository, 'save')
        .mockResolvedValue(existingConnection);

      await service.exchangeCodeForTokens(code, codeVerifier, workspaceId);

      // Verify that save was called (for update)
      expect(xeroConnectionRepository.save).toHaveBeenCalled();
    });

    it('should throw error if code verifier is invalid', async () => {
      const code = 'auth-code-123';
      const invalidCodeVerifier = 'short'; // Too short
      const workspaceId = 'test-workspace-id';

      await expect(
        service.exchangeCodeForTokens(code, invalidCodeVerifier, workspaceId),
      ).rejects.toThrow(CustomError);
    });

    it('should throw error if no tenants are returned', async () => {
      const code = 'auth-code-123';
      const codeVerifier = 'a'.repeat(43);
      const workspaceId = 'test-workspace-id';

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: mockTokenResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: [], // Empty tenants array
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      await expect(
        service.exchangeCodeForTokens(code, codeVerifier, workspaceId),
      ).rejects.toThrow(CustomError);
    });

    it('should handle token exchange failure', async () => {
      const code = 'auth-code-123';
      const codeVerifier = 'a'.repeat(43);
      const workspaceId = 'test-workspace-id';

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(
          throwError(() => new Error('Token exchange failed')),
        );

      await expect(
        service.exchangeCodeForTokens(code, codeVerifier, workspaceId),
      ).rejects.toThrow(CustomError);
    });
  });

  describe('refreshAccessToken', () => {
    const mockTokenResponse: XeroTokenResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 1800,
      token_type: 'Bearer',
    };

    it('should successfully refresh access token', async () => {
      const refreshToken = 'old-refresh-token';
      const workspaceId = 'test-workspace-id';

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: mockTokenResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      jest
        .spyOn(xeroConnectionRepository, 'update')
        .mockResolvedValue({} as any);

      const result = await service.refreshAccessToken(
        refreshToken,
        workspaceId,
      );

      expect(result).toHaveProperty('accessToken', mockTokenResponse.access_token);
      expect(result).toHaveProperty('refreshToken', mockTokenResponse.refresh_token);
      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify token endpoint was called with refresh_token grant
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('identity.xero.com/connect/token'),
        expect.stringContaining('refresh_token'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      // Verify connection was updated
      expect(xeroConnectionRepository.update).toHaveBeenCalledWith(
        { workspaceId },
        expect.objectContaining({
          encryptedAccessToken: mockTokenResponse.access_token,
          encryptedRefreshToken: mockTokenResponse.refresh_token,
        }),
      );
    });

    it('should refresh token without updating database if workspaceId not provided', async () => {
      const refreshToken = 'old-refresh-token';

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: mockTokenResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      jest
        .spyOn(xeroConnectionRepository, 'update')
        .mockResolvedValue({} as any);

      const result = await service.refreshAccessToken(refreshToken);

      expect(result.accessToken).toBe(mockTokenResponse.access_token);
      expect(xeroConnectionRepository.update).not.toHaveBeenCalled();
    });

    it('should handle refresh token failure', async () => {
      const refreshToken = 'invalid-refresh-token';

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Invalid refresh token')));

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        CustomError,
      );
    });
  });

  describe('decodeAndValidateState', () => {
    it('should decode valid state parameter', () => {
      const workspaceId = 'test-workspace-id';
      const state = 'test-state';
      const timestamp = Date.now();

      const stateData = {
        workspaceId,
        state,
        timestamp,
      };

      const encodedState = Buffer.from(JSON.stringify(stateData)).toString(
        'base64url',
      );

      const result = service.decodeAndValidateState(encodedState);

      expect(result.workspaceId).toBe(workspaceId);
      expect(result.state).toBe(state);
      expect(result.timestamp).toBe(timestamp);
    });

    it('should throw error for invalid state structure', () => {
      const invalidState = Buffer.from(
        JSON.stringify({ invalid: 'data' }),
      ).toString('base64url');

      expect(() => service.decodeAndValidateState(invalidState)).toThrow(
        CustomError,
      );
    });

    it('should throw error for expired state', () => {
      const workspaceId = 'test-workspace-id';
      const state = 'test-state';
      const timestamp = Date.now() - 700000; // 11+ minutes ago

      const stateData = {
        workspaceId,
        state,
        timestamp,
      };

      const encodedState = Buffer.from(JSON.stringify(stateData)).toString(
        'base64url',
      );

      expect(() => service.decodeAndValidateState(encodedState)).toThrow(
        CustomError,
      );
    });

    it('should throw error for malformed base64', () => {
      expect(() => service.decodeAndValidateState('not-valid-base64!@#')).toThrow(
        CustomError,
      );
    });
  });

  describe('disconnectWorkspace', () => {
    it('should mark connection as inactive', async () => {
      const workspaceId = 'test-workspace-id';

      jest
        .spyOn(xeroConnectionRepository, 'update')
        .mockResolvedValue({} as any);

      await service.disconnectWorkspace(workspaceId);

      expect(xeroConnectionRepository.update).toHaveBeenCalledWith(
        { workspaceId },
        expect.objectContaining({
          isActive: false,
        }),
      );
    });
  });

  describe('isConnected', () => {
    it('should return true if active connection exists', async () => {
      const workspaceId = 'test-workspace-id';
      const mockConnection = {
        id: 'connection-id',
        workspaceId,
        isActive: true,
      } as XeroConnectionEntity;

      jest
        .spyOn(xeroConnectionRepository, 'findOne')
        .mockResolvedValue(mockConnection);

      const result = await service.isConnected(workspaceId);

      expect(result).toBe(true);
    });

    it('should return false if no active connection exists', async () => {
      const workspaceId = 'test-workspace-id';

      jest.spyOn(xeroConnectionRepository, 'findOne').mockResolvedValue(null);

      const result = await service.isConnected(workspaceId);

      expect(result).toBe(false);
    });
  });

  describe('getConnection', () => {
    it('should return active connection for workspace', async () => {
      const workspaceId = 'test-workspace-id';
      const mockConnection = {
        id: 'connection-id',
        workspaceId,
        isActive: true,
      } as XeroConnectionEntity;

      jest
        .spyOn(xeroConnectionRepository, 'findOne')
        .mockResolvedValue(mockConnection);

      const result = await service.getConnection(workspaceId);

      expect(result).toBe(mockConnection);
      expect(xeroConnectionRepository.findOne).toHaveBeenCalledWith({
        where: { workspaceId, isActive: true },
      });
    });

    it('should return null if no active connection exists', async () => {
      const workspaceId = 'test-workspace-id';

      jest.spyOn(xeroConnectionRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getConnection(workspaceId);

      expect(result).toBeNull();
    });
  });
});
