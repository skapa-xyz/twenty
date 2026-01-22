# Xero Integration Module

This module provides comprehensive integration with the Xero accounting platform, enabling seamless synchronization of contacts, invoices, and financial data between the CRM and Xero.

## Features

- **OAuth 2.0 Authentication with PKCE**: Secure authorization code flow with Proof Key for Code Exchange (RFC 7636)
- **Contact Synchronization**: Bidirectional sync of contacts with duplicate detection
- **Invoice Management**: Automated invoice creation from CRM opportunities
- **Webhook Support**: Real-time updates from Xero
- **Token Security**: AES-256-GCM encryption for OAuth tokens
- **Automatic Token Refresh**: Handles token expiration transparently
- **CSRF Protection**: State parameter validation for OAuth flow security

## Architecture

```
xero-integration/
├── controllers/
│   ├── xero-auth.controller.ts       # OAuth flow endpoints
│   └── xero-webhook.controller.ts    # Webhook receiver
├── services/
│   ├── xero-auth.service.ts          # OAuth2 flow with PKCE
│   ├── xero-client.service.ts        # HTTP API wrapper
│   ├── xero-contact.service.ts       # Contact sync logic
│   ├── xero-invoice.service.ts       # Invoice creation
│   ├── xero-token.service.ts         # Token encryption/storage
│   └── xero-webhook.service.ts       # Webhook processing
├── entities/
│   └── xero-connection.entity.ts     # Database schema
├── types/
│   └── xero-contact.types.ts         # TypeScript types
├── utils/
│   └── xero-webhook-signature.util.ts # HMAC verification
└── xero.module.ts                    # Module definition
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Xero OAuth Credentials
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=http://localhost:3000/api/auth/xero/callback

# Xero Scopes (comma-separated)
XERO_SCOPES=accounting.transactions,accounting.contacts.read,accounting.contacts

# Token Encryption (64-character hex string = 32 bytes)
XERO_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Webhook Verification
XERO_WEBHOOK_KEY=your_xero_webhook_key
```

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Usage Examples

### Contact Synchronization

#### Find or Create Contact

```typescript
import { XeroContactService } from './services/xero-contact.service';

@Injectable()
export class MyService {
  constructor(private readonly xeroContactService: XeroContactService) {}

  async syncContactToXero(workspaceId: string, person: PersonWorkspaceEntity) {
    const contact = await this.xeroContactService.findOrCreateContact(
      workspaceId,
      {
        firstName: person.name?.firstName,
        lastName: person.name?.lastName,
        email: person.emails?.primaryEmail,
        phone: person.phones?.primaryPhoneNumber,
        city: person.city,
      }
    );

    console.log('Xero contact ID:', contact.contactID);
    return contact;
  }
}
```

#### Get Specific Contact

```typescript
const contact = await xeroContactService.getContact(
  workspaceId,
  'xero-contact-id-123'
);

if (contact) {
  console.log('Found contact:', contact.name);
} else {
  console.log('Contact not found');
}
```

#### Update Contact

```typescript
const updatedContact = await xeroContactService.updateContact(
  workspaceId,
  'xero-contact-id-123',
  {
    phone: '+61412345678',
    city: 'Sydney',
  }
);
```

### Direct API Access

The `XeroClientService` provides low-level HTTP methods for direct Xero API access:

```typescript
import { XeroClientService } from './services/xero-client.service';

@Injectable()
export class MyService {
  constructor(private readonly xeroClient: XeroClientService) {}

  async getInvoices(workspaceId: string) {
    // GET request
    const response = await this.xeroClient.get(
      workspaceId,
      '/Invoices',
      {
        params: {
          where: 'Status=="DRAFT"',
          order: 'UpdatedDateUTC DESC',
        },
      }
    );
    return response.Invoices;
  }

  async createInvoice(workspaceId: string, invoiceData: any) {
    // POST request
    const response = await this.xeroClient.post(
      workspaceId,
      '/Invoices',
      {
        Invoices: [invoiceData],
      }
    );
    return response.Invoices[0];
  }

  async updateInvoice(workspaceId: string, invoiceId: string, updates: any) {
    // PUT request
    const response = await this.xeroClient.put(
      workspaceId,
      `/Invoices/${invoiceId}`,
      {
        Invoices: [{ InvoiceID: invoiceId, ...updates }],
      }
    );
    return response.Invoices[0];
  }
}
```

## OAuth2 Flow with PKCE

### XeroAuthService

Handles OAuth2 authorization code flow with PKCE (Proof Key for Code Exchange) for secure integration with Xero.

**What is PKCE?**

PKCE (RFC 7636) is a security extension to OAuth2 that prevents authorization code interception attacks. It uses dynamically generated cryptographic codes to bind the authorization request to the token request.

**Flow Diagram:**

```
1. Generate PKCE Pair
   ↓
   codeVerifier (random, 43-128 chars)
   codeChallenge = SHA256(codeVerifier)

2. Authorization Request
   ↓
   Redirect to Xero with codeChallenge
   Store codeVerifier in session

3. User Authorizes
   ↓
   Xero redirects back with code

4. Token Exchange
   ↓
   Exchange code + codeVerifier for tokens
   Store encrypted tokens in database
```

**Methods:**

- `getAuthorizationUrl(workspaceId, state?)` - Generate authorization URL with PKCE
  - Returns: `{ url, codeVerifier, state }`
  - Store `codeVerifier` and `state` in session for callback validation

- `exchangeCodeForTokens(code, codeVerifier, workspaceId)` - Exchange code for tokens
  - Validates PKCE code verifier
  - Fetches authorized Xero tenants
  - Stores encrypted tokens in database
  - Returns: `XeroConnectionEntity`

- `refreshAccessToken(refreshToken, workspaceId?)` - Refresh expired access token
  - Automatically updates database if `workspaceId` provided
  - Returns: `{ accessToken, refreshToken, expiresAt }`

- `generatePKCEPair()` - Generate PKCE code verifier and challenge
  - Code verifier: 32 random bytes, base64url-encoded
  - Code challenge: SHA256(codeVerifier), base64url-encoded
  - Returns: `{ codeVerifier, codeChallenge }`

- `decodeAndValidateState(encodedState)` - Validate state parameter
  - Prevents CSRF attacks
  - Validates state hasn't expired (10 minute window)
  - Returns: `{ workspaceId, state, timestamp }`

- `disconnectWorkspace(workspaceId)` - Disconnect Xero integration
  - Marks connection as inactive in database

- `getConnection(workspaceId)` - Get active connection
  - Returns: `XeroConnectionEntity | null`

- `isConnected(workspaceId)` - Check connection status
  - Returns: `boolean`

**Example Usage:**

```typescript
import { XeroAuthService } from './services/xero-auth.service';

@Injectable()
export class AuthFlowService {
  constructor(private readonly xeroAuth: XeroAuthService) {}

  async initiateOAuth(workspaceId: string, session: any) {
    // Step 1: Generate authorization URL
    const { url, codeVerifier, state } =
      await this.xeroAuth.getAuthorizationUrl(workspaceId);

    // Store for callback validation
    session.xeroCodeVerifier = codeVerifier;
    session.xeroState = state;

    return url; // Redirect user to this URL
  }

  async handleCallback(code: string, state: string, session: any) {
    // Step 2: Validate state
    const decodedState = this.xeroAuth.decodeAndValidateState(state);

    if (decodedState.state !== session.xeroState) {
      throw new Error('Invalid state - CSRF attack detected');
    }

    // Step 3: Exchange code for tokens
    const connection = await this.xeroAuth.exchangeCodeForTokens(
      code,
      session.xeroCodeVerifier,
      decodedState.workspaceId
    );

    // Clear session
    delete session.xeroCodeVerifier;
    delete session.xeroState;

    return connection;
  }

  async checkConnection(workspaceId: string) {
    const isConnected = await this.xeroAuth.isConnected(workspaceId);

    if (isConnected) {
      const connection = await this.xeroAuth.getConnection(workspaceId);
      return {
        connected: true,
        tenantName: connection.tenantName,
        tenantId: connection.tenantId,
      };
    }

    return { connected: false };
  }
}
```

**Security Features:**

- **PKCE**: Prevents authorization code interception
- **State Parameter**: CSRF protection with timestamp validation
- **Session Storage**: Code verifier never sent to Xero
- **Token Encryption**: Access/refresh tokens encrypted in database
- **Automatic Expiration**: State expires after 10 minutes

**Environment Variables:**

```bash
# Required for XeroAuthService
AUTH_XERO_CLIENT_ID=your_xero_client_id
AUTH_XERO_CLIENT_SECRET=your_xero_client_secret
AUTH_XERO_CALLBACK_URL=https://your-domain.com/api/auth/xero/callback
```

**Testing:**

```bash
npx nx test twenty-server --testPathPattern=xero-auth.service.spec.ts
```

Test coverage includes:
- PKCE pair generation and uniqueness
- Authorization URL generation
- State encoding/decoding/validation
- Code exchange flow
- Token refresh flow
- Connection management
- Error handling

---

## Service Documentation

### XeroContactService

Manages contact synchronization between CRM and Xero.

**Methods:**

- `findOrCreateContact(workspaceId, contactData)` - Search by email, create if not found
- `getContact(workspaceId, contactId)` - Fetch specific contact by ID
- `updateContact(workspaceId, contactId, updates)` - Update existing contact

**Features:**

- Email-based duplicate detection
- Automatic mapping from CRM Person/Company entities
- Handles missing data gracefully
- Validates required fields

### XeroClientService

Low-level HTTP client for Xero API requests.

**Methods:**

- `get(workspaceId, endpoint, config?)` - GET request
- `post(workspaceId, endpoint, data?, config?)` - POST request
- `put(workspaceId, endpoint, data?, config?)` - PUT request

**Features:**

- Automatic token refresh on 401 responses
- Workspace-based authentication
- Proper Xero headers (Authorization, Xero-tenant-id)
- Error handling and logging

### XeroTokenService

Manages OAuth token storage with encryption.

**Methods:**

- `saveTokens(workspaceId, tokens)` - Store encrypted tokens
- `getTokens(workspaceId)` - Retrieve decrypted tokens
- `getConnectionsExpiringBefore(date)` - Find expiring connections
- `markDisconnected(workspaceId)` - Deactivate connection

**Security:**

- AES-256-GCM encryption
- Per-token initialization vectors
- Authentication tags for integrity
- Secure key derivation

## Error Handling

All services throw `CustomError` instances with specific error codes:

```typescript
import { CustomError } from 'twenty-shared/utils';
import { XeroContactServiceExceptionCode } from './services/xero-contact.service';

try {
  const contact = await xeroContactService.findOrCreateContact(workspaceId, data);
} catch (error) {
  if (error instanceof CustomError) {
    switch (error.code) {
      case XeroContactServiceExceptionCode.INVALID_CONTACT_DATA:
        // Handle invalid data
        break;
      case XeroContactServiceExceptionCode.CONTACT_CREATE_FAILED:
        // Handle creation failure
        break;
      default:
        // Handle other errors
    }
  }
  throw error;
}
```

## Testing

Run the test suite:

```bash
# Unit tests
npx nx test twenty-server --testPathPattern=xero-integration

# Specific service tests
npx nx test twenty-server --testPathPattern=xero-contact.service.spec
```

Example test:

```typescript
import { Test } from '@nestjs/testing';
import { XeroContactService } from './xero-contact.service';
import { XeroClientService } from './xero-client.service';

describe('XeroContactService', () => {
  let service: XeroContactService;
  let mockXeroClient: jest.Mocked<XeroClientService>;

  beforeEach(async () => {
    mockXeroClient = {
      get: jest.fn(),
      post: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        XeroContactService,
        { provide: XeroClientService, useValue: mockXeroClient },
      ],
    }).compile();

    service = module.get(XeroContactService);
  });

  it('should find existing contact', async () => {
    mockXeroClient.get.mockResolvedValue({
      contacts: [{ contactID: '123', name: 'Test' }],
    });

    const result = await service.findOrCreateContact('ws-1', {
      email: 'test@example.com',
    });

    expect(result.contactID).toBe('123');
  });
});
```

## Webhook Integration

### Setting Up Webhooks

1. Configure webhook URL in Xero Developer Portal:
   ```
   https://your-domain.com/api/webhooks/xero
   ```

2. Set webhook signing key in environment:
   ```bash
   XERO_WEBHOOK_KEY=your_webhook_key
   ```

3. The webhook controller automatically verifies signatures using HMAC-SHA256

### Webhook Events

The system processes these Xero webhook events:

- `INVOICE.CREATE` - New invoice created
- `INVOICE.UPDATE` - Invoice updated
- `INVOICE.DELETE` - Invoice deleted
- `CONTACT.CREATE` - New contact created
- `CONTACT.UPDATE` - Contact updated

## Database Schema

The `xeroConnection` table stores OAuth credentials per workspace:

```sql
CREATE TABLE "core"."xeroConnection" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "workspaceId" uuid NOT NULL UNIQUE,
  "tenantId" varchar(255),
  "tenantName" varchar(255),
  "encryptedAccessToken" text NOT NULL,
  "encryptedRefreshToken" text NOT NULL,
  "tokenExpiresAt" timestamptz NOT NULL,
  "scopes" varchar[] DEFAULT '{}',
  "isActive" boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE
);
```

## Best Practices

1. **Always use workspace-scoped calls**: Pass `workspaceId` to ensure proper isolation

2. **Handle rate limits**: Xero has rate limits (60 requests/minute). The client handles 429 responses gracefully.

3. **Validate data before sync**: Use the type definitions to ensure data quality

4. **Monitor token expiration**: Tokens expire after 30 minutes; the service refreshes automatically

5. **Log errors appropriately**: Use the built-in logger for debugging

6. **Test with sandbox**: Use Xero's sandbox environment for development

## Migration Guide

Migrating from direct Xero SDK usage:

**Before:**
```typescript
const xero = new XeroClient();
await xero.setTokenSet({ access_token: token });
const response = await xero.accountingApi.getContacts(tenantId);
```

**After:**
```typescript
const response = await this.xeroClient.get(workspaceId, '/Contacts');
```

Benefits:
- Automatic token management
- Workspace isolation
- Error handling
- Consistent logging

## Troubleshooting

### Common Issues

**Error: "No active Xero connection found"**
- Ensure workspace has completed OAuth flow
- Check `xeroConnection` table for active connection

**Error: "Failed to refresh Xero access token"**
- Verify `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are correct
- Check if user revoked access in Xero

**Error: "Invalid signature" (webhooks)**
- Verify `XERO_WEBHOOK_KEY` matches Xero developer console
- Ensure webhook payload isn't modified by middleware

**Error: "XERO_ENCRYPTION_KEY must be a 64-character hex string"**
- Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Must be exactly 64 hexadecimal characters

## References

- [Xero API Documentation](https://developer.xero.com/documentation/api/accounting/overview)
- [Xero OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/overview)
- [Xero Webhooks Guide](https://developer.xero.com/documentation/guides/webhooks/overview)
- [Xero Rate Limits](https://developer.xero.com/documentation/guides/oauth2/limits)

## Support

For issues or questions:
1. Check the logs in your application
2. Review Xero API status: https://status.developer.xero.com/
3. Consult Xero developer forums: https://central.xero.com/s/
