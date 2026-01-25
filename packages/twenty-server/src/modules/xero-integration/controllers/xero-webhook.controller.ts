// packages/twenty-server/src/modules/xero-integration/controllers/xero-webhook.controller.ts

import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { verifyXeroWebhookSignature } from 'src/modules/xero-integration/utils/xero-webhook-signature.util';
import { XeroWebhookService } from 'src/modules/xero-integration/services/xero-webhook.service';

interface XeroWebhookEvent {
  resourceUrl: string;
  resourceId: string;
  tenantId: string;
  tenantType: string;
  eventCategory: string;
  eventType: string;
  eventDateUtc: string;
}

interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
  firstEventSequence: number;
  lastEventSequence: number;
  entropy: string;
}

@Controller('api/webhooks/xero')
export class XeroWebhookController {
  private readonly logger = new Logger(XeroWebhookController.name);
  private readonly webhookKey: string;
  private readonly isConfigured: boolean;

  constructor(private readonly webhookService: XeroWebhookService) {
    const key = process.env.XERO_WEBHOOK_KEY;

    if (!key) {
      this.logger.warn(
        'XERO_WEBHOOK_KEY environment variable is not configured. Xero webhooks will not function.',
      );
      this.webhookKey = '';
      this.isConfigured = false;
    } else {
      this.webhookKey = key;
      this.isConfigured = true;
    }
  }

  /**
   * Validates that Xero webhooks are properly configured before processing.
   * @throws BadRequestException if not configured
   */
  private validateConfigured(): void {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'Xero webhooks are not configured. Please set XERO_WEBHOOK_KEY environment variable.',
      );
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-xero-signature') signature: string,
    @Body() payload: XeroWebhookPayload,
  ): Promise<{ status: string }> {
    this.validateConfigured();
    // Verify signature
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    if (!signature) {
      throw new BadRequestException('Missing x-xero-signature header');
    }

    const isValid = verifyXeroWebhookSignature(
      rawBody,
      signature,
      this.webhookKey,
    );

    if (!isValid) {
      this.logger.warn('Invalid Xero webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(
      `Received Xero webhook with ${payload.events.length} events`,
    );

    // Process events asynchronously
    for (const event of payload.events) {
      try {
        await this.webhookService.processEvent(event);
      } catch (error) {
        this.logger.error(
          `Failed to process Xero event: ${error.message}`,
          error.stack,
        );
      }
    }

    return { status: 'ok' };
  }
}
