import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';

import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { FormsLiveWebhookService } from 'src/modules/formslive-integration/services/formslive-webhook.service';
import { FormsLiveWebhookPayload } from 'src/modules/formslive-integration/types/formslive.types';

/**
 * FormsLive Webhook Controller
 *
 * Receives webhook events from FormsLive when form events occur:
 * - form.create: A form was created
 * - form.update: A form was updated
 * - form.sign: A form was signed in-person
 * - form.remotesign: Remote signing status changed
 * - form.finalise: All signatures complete, form finalized
 *
 * Security considerations:
 * - FormsLive webhooks don't use signature verification by default
 * - We validate by checking the form exists in our records
 * - Endpoint is public but only accepts valid event payloads
 *
 * The controller delegates to FormsLiveWebhookService for processing.
 */
@Controller('api/webhooks/formslive')
export class FormsLiveWebhookController {
  private readonly logger = new Logger(FormsLiveWebhookController.name);

  constructor(private readonly webhookService: FormsLiveWebhookService) {}

  /**
   * Handles incoming webhook events from FormsLive.
   *
   * Always returns 200 OK to prevent FormsLive from retrying.
   * Errors are logged but don't affect the response.
   *
   * @param payload - The webhook event payload
   * @returns Success status
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async handleWebhook(
    @Body() payload: FormsLiveWebhookPayload,
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received FormsLive webhook: ${payload.type} for form ${payload.payload?.id}`,
    );

    // Validate payload structure
    if (!payload.type || !payload.payload?.id) {
      this.logger.warn('Invalid webhook payload received', payload);

      return { status: 'invalid_payload' };
    }

    try {
      await this.webhookService.processEvent(payload);

      return { status: 'ok' };
    } catch (error) {
      // Log error but return 200 to prevent retry spam
      this.logger.error(
        `Failed to process FormsLive webhook: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return { status: 'error_logged' };
    }
  }

  /**
   * Health check endpoint for webhook configuration testing.
   *
   * FormsLive may ping this endpoint to verify webhook URL is valid.
   */
  @Post('ping')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async ping(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
