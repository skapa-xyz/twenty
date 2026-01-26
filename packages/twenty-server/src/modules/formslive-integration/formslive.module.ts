import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

import { FormsLiveConnectionEntity } from './entities/formslive-connection.entity';
import { FormsLiveAuthController } from './controllers/formslive-auth.controller';
import { FormsLiveWebhookController } from './controllers/formslive-webhook.controller';
import { FormsLiveTokenService } from './services/formslive-token.service';
import { FormsLiveClientService } from './services/formslive-client.service';
import { FormsLiveFormService } from './services/formslive-form.service';
import { FormsLiveSigningService } from './services/formslive-signing.service';
import { FormsLiveTemplateService } from './services/formslive-template.service';
import { FormsLiveWebhookService } from './services/formslive-webhook.service';
import { FormsLiveFieldMapperService } from './services/formslive-field-mapper.service';
import { FormsLiveConnectionResolver } from './resolvers/formslive-connection.resolver';
import { EngagementStageListener } from './listeners/engagement-stage-listener';
import { FormsLiveCreateFormJob } from './jobs/formslive-create-form.job';

/**
 * FormsLive Integration Module
 *
 * This module provides complete integration with FormsLive (RealWorks) for
 * automated engagement agreement generation and eSignature workflows.
 *
 * Key features:
 * - Per-user FormsLive connection (each Buyers Agent has their own account)
 * - State-based API routing (QLD, NSW, VIC, etc.)
 * - Automatic form creation when opportunities move to 'engagement' stage
 * - Remote eSignature workflow with webhook notifications
 * - Template discovery and selection
 *
 * Authentication:
 * Unlike Xero (OAuth 2.0), FormsLive uses a simpler model:
 * - API key (shared across all users, stored in env var)
 * - Access token (per-user, encrypted and stored in database)
 *
 * Configuration:
 * Required environment variables:
 * - FORMSLIVE_API_KEY: API key from FormsLive developer console
 * - FORMSLIVE_ENCRYPTION_KEY: 64-character hex string for token encryption
 *   (or falls back to XERO_ENCRYPTION_KEY)
 *
 * Workflow:
 * 1. User connects FormsLive with their access token
 * 2. User selects which template to use for engagement agreements
 * 3. When opportunity moves to 'engagement' stage:
 *    - Form is created from template
 *    - Fields are populated with Buyer data
 *    - Remote signing is initiated
 * 4. Webhooks notify when signing is complete
 * 5. Buyer.engagementSignedDate is updated
 *
 * @see FormsLiveTokenService - Token encryption and storage
 * @see FormsLiveClientService - API client with state routing
 * @see FormsLiveFormService - Form creation and population
 * @see FormsLiveSigningService - eSignature workflow
 * @see EngagementStageListener - Event-driven automation
 */
@Module({
  imports: [
    // Register the FormsLiveConnectionEntity for database operations
    TypeOrmModule.forFeature([FormsLiveConnectionEntity]),
    // HTTP module for making API requests to FormsLive
    HttpModule.register({
      timeout: 15000, // 15 second timeout for FormsLive API calls
      maxRedirects: 5,
    }),
    // Auth modules for JwtAuthGuard dependencies
    TokenModule,
    WorkspaceCacheStorageModule,
  ],
  controllers: [
    // Authentication endpoints (connect, disconnect, status)
    FormsLiveAuthController,
    // Webhook receiver for FormsLive events
    FormsLiveWebhookController,
  ],
  providers: [
    // Core services
    FormsLiveTokenService,
    FormsLiveClientService,
    FormsLiveFormService,
    FormsLiveSigningService,
    FormsLiveTemplateService,
    FormsLiveWebhookService,
    FormsLiveFieldMapperService,
    // GraphQL resolvers
    FormsLiveConnectionResolver,
    // Event listeners
    EngagementStageListener,
    // Job processors
    FormsLiveCreateFormJob,
  ],
  exports: [
    // Export services for use in other modules if needed
    FormsLiveTokenService,
    FormsLiveClientService,
    FormsLiveFormService,
    FormsLiveSigningService,
    FormsLiveTemplateService,
  ],
})
export class FormsLiveModule {}
