import * as crypto from 'crypto';

export function verifyXeroWebhookSignature(
  payload: Buffer | string,
  signature: string,
  webhookKey: string,
): boolean {
  const payloadBuffer = typeof payload === 'string'
    ? Buffer.from(payload, 'utf8')
    : payload;

  const computed = crypto
    .createHmac('sha256', webhookKey)
    .update(payloadBuffer)
    .digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computed),
    );
  } catch {
    return false;
  }
}
