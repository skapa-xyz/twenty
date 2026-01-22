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
} from '@nestjs/common';
import { Request } from 'express';
import { verifyXeroWebhookSignature } from '../utils/xero-webhook-signature.util';
import { XeroWebhookService } from '../services/xero-webhook.service';

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

  constructor(private readonly webhookService: XeroWebhookService) {
    const key = process.env.XERO_WEBHOOK_KEY;
    if (!key) {
      throw new Error('XERO_WEBHOOK_KEY environment variable is required');
    }
    this.webhookKey = key;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-xero-signature') signature: string,
    @Body() payload: XeroWebhookPayload,
  ): Promise<{ status: string }> {
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

    this.logger.log(`Received Xero webhook with ${payload.events.length} events`);

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
