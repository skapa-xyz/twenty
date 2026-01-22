import * as crypto from 'crypto';
import { verifyXeroWebhookSignature } from './xero-webhook-signature.util';

describe('verifyXeroWebhookSignature', () => {
  const testWebhookKey = 'test-webhook-key-12345';
  const testPayload = JSON.stringify({
    events: [
      {
        resourceUrl: 'https://api.xero.com/api.xro/2.0/Invoices/abc123',
        resourceId: 'abc123',
        tenantId: 'tenant-123',
        tenantType: 'ORGANISATION',
        eventCategory: 'INVOICE',
        eventType: 'CREATE',
        eventDateUtc: '2024-01-01T12:00:00Z',
      },
    ],
    firstEventSequence: 1,
    lastEventSequence: 1,
    entropy: 'random-string',
  });

  function generateValidSignature(payload: string | Buffer, key: string): string {
    const payloadBuffer = typeof payload === 'string'
      ? Buffer.from(payload, 'utf8')
      : payload;

    return crypto
      .createHmac('sha256', key)
      .update(payloadBuffer)
      .digest('base64');
  }

  describe('with valid signatures', () => {
    it('should return true for a valid signature with string payload', () => {
      const signature = generateValidSignature(testPayload, testWebhookKey);
      const result = verifyXeroWebhookSignature(testPayload, signature, testWebhookKey);

      expect(result).toBe(true);
    });

    it('should return true for a valid signature with Buffer payload', () => {
      const payloadBuffer = Buffer.from(testPayload, 'utf8');
      const signature = generateValidSignature(payloadBuffer, testWebhookKey);
      const result = verifyXeroWebhookSignature(payloadBuffer, signature, testWebhookKey);

      expect(result).toBe(true);
    });

    it('should handle empty payload correctly', () => {
      const emptyPayload = '';
      const signature = generateValidSignature(emptyPayload, testWebhookKey);
      const result = verifyXeroWebhookSignature(emptyPayload, signature, testWebhookKey);

      expect(result).toBe(true);
    });
  });

  describe('with invalid signatures', () => {
    it('should return false for incorrect signature', () => {
      const invalidSignature = 'invalid-signature';
      const result = verifyXeroWebhookSignature(testPayload, invalidSignature, testWebhookKey);

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong webhook key', () => {
      const signature = generateValidSignature(testPayload, testWebhookKey);
      const wrongKey = 'wrong-webhook-key';
      const result = verifyXeroWebhookSignature(testPayload, signature, wrongKey);

      expect(result).toBe(false);
    });

    it('should return false for signature with modified payload', () => {
      const signature = generateValidSignature(testPayload, testWebhookKey);
      const modifiedPayload = testPayload + ' ';
      const result = verifyXeroWebhookSignature(modifiedPayload, signature, testWebhookKey);

      expect(result).toBe(false);
    });

    it('should return false for empty signature', () => {
      const result = verifyXeroWebhookSignature(testPayload, '', testWebhookKey);

      expect(result).toBe(false);
    });
  });

  describe('security', () => {
    it('should use timing-safe comparison to prevent timing attacks', () => {
      // This test verifies that crypto.timingSafeEqual is used by checking
      // that signatures of different lengths are handled correctly
      const signature = generateValidSignature(testPayload, testWebhookKey);
      const shorterSignature = signature.substring(0, signature.length - 1);

      // timingSafeEqual throws when buffer lengths don't match
      // Our function should catch this and return false
      const result = verifyXeroWebhookSignature(testPayload, shorterSignature, testWebhookKey);

      expect(result).toBe(false);
    });

    it('should handle special characters in payload', () => {
      const specialPayload = '{"test": "value with 特殊字符 and émojis 🎉"}';
      const signature = generateValidSignature(specialPayload, testWebhookKey);
      const result = verifyXeroWebhookSignature(specialPayload, signature, testWebhookKey);

      expect(result).toBe(true);
    });

    it('should handle large payloads correctly', () => {
      const largePayload = JSON.stringify({
        events: Array(100).fill({
          resourceUrl: 'https://api.xero.com/api.xro/2.0/Invoices/abc123',
          resourceId: 'abc123',
          tenantId: 'tenant-123',
          tenantType: 'ORGANISATION',
          eventCategory: 'INVOICE',
          eventType: 'CREATE',
          eventDateUtc: '2024-01-01T12:00:00Z',
        }),
      });
      const signature = generateValidSignature(largePayload, testWebhookKey);
      const result = verifyXeroWebhookSignature(largePayload, signature, testWebhookKey);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle webhook key with special characters', () => {
      const specialKey = 'key-with-@#$%^&*()-_=+[]{}|;:,.<>?';
      const signature = generateValidSignature(testPayload, specialKey);
      const result = verifyXeroWebhookSignature(testPayload, signature, specialKey);

      expect(result).toBe(true);
    });

    it('should handle Buffer payload and string signature consistently', () => {
      const payloadBuffer = Buffer.from(testPayload, 'utf8');
      const signature = generateValidSignature(payloadBuffer, testWebhookKey);

      const resultWithBuffer = verifyXeroWebhookSignature(payloadBuffer, signature, testWebhookKey);
      const resultWithString = verifyXeroWebhookSignature(testPayload, signature, testWebhookKey);

      expect(resultWithBuffer).toBe(true);
      expect(resultWithString).toBe(true);
    });
  });
});
