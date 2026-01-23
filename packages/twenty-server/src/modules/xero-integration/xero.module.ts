import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { XeroConnectionEntity } from './entities/xero-connection.entity';
import { XeroAuthController } from './controllers/xero-auth.controller';
import { XeroWebhookController } from './controllers/xero-webhook.controller';
import { XeroTokenService } from './services/xero-token.service';
import { XeroClientService } from './services/xero-client.service';
import { XeroContactService } from './services/xero-contact.service';
import { XeroInvoiceService } from './services/xero-invoice.service';
import { XeroWebhookService } from './services/xero-webhook.service';
import { OpportunityStageChangedListener } from './listeners/opportunity-stage-changed.listener';
import { XeroTokenRefreshCronJob } from './jobs/xero-token-refresh.cron.job';
import { XeroCreateInvoiceJob } from './jobs/xero-create-invoice.job';

/**
 * Xero Integration Module
 *
 * This module provides complete integration with Xero accounting platform:
 * - OAuth 2.0 authentication flow (XeroAuthController)
 * - Webhook handling for real-time updates (XeroWebhookController)
 * - Secure token management with encryption (XeroTokenService)
 * - HTTP client for Xero API calls (XeroClientService)
 * - Contact synchronization (XeroContactService)
 * - Invoice creation and management (XeroInvoiceService)
 * - Event-driven automation (OpportunityStageChangedListener)
 * - Proactive token refresh (XeroTokenRefreshCronJob)
 *
 * Configuration:
 * The module requires the following environment variables:
 * - XERO_CLIENT_ID: OAuth client ID from Xero developer console
 * - XERO_CLIENT_SECRET: OAuth client secret
 * - XERO_REDIRECT_URI: OAuth callback URL (e.g., http://localhost:3000/api/auth/xero/callback)
 * - XERO_SCOPES: Comma-separated OAuth scopes (e.g., accounting.transactions,accounting.contacts)
 * - XERO_ENCRYPTION_KEY: 64-character hex string for token encryption (32 bytes)
 * - XERO_WEBHOOK_KEY: Webhook signature verification key from Xero
 *
 * Example:
 * ```typescript
 * // Import in your app.module.ts
 * @Module({
 *   imports: [
 *     XeroModule,
 *     // ... other modules
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [
    // Register the XeroConnectionEntity for database operations
    TypeOrmModule.forFeature([XeroConnectionEntity]),
    // HTTP module for making API requests to Xero
    HttpModule.register({
      timeout: 10000, // 10 second timeout for Xero API calls
      maxRedirects: 5,
    }),
  ],
  controllers: [
    // OAuth authentication endpoints
    XeroAuthController,
    // Webhook receiver for Xero events
    XeroWebhookController,
  ],
  providers: [
    // Core services
    XeroTokenService,
    XeroClientService,
    XeroContactService,
    XeroInvoiceService,
    XeroWebhookService,
    // Event listeners
    OpportunityStageChangedListener,
    // Job processors
    XeroCreateInvoiceJob,
    // Cron jobs
    XeroTokenRefreshCronJob,
  ],
  exports: [
    // Export services for use in other modules
    XeroTokenService,
    XeroClientService,
    XeroContactService,
    XeroInvoiceService,
  ],
})
export class XeroModule {}
