import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { stmts } from '../db.js';
import { SOSRequest, SOSResponse } from '../types.js';

const SOSSchema = z.object({
  phone: z.string().min(8).max(20),
  message: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional()
});

export function sanitizePhone(raw: string): string {
  // Strip everything except digits and leading +
  const cleaned = raw.trim().replace(/[^\d+]/g, '');
  // If starts with +, strip + for wa.me / numeric validation
  const digits = cleaned.replace(/\D/g, '');
  return digits;
}

export function maskPhone(digits: string): string {
  if (digits.length <= 4) return '****';
  const prefix = digits.slice(0, 2);
  const suffix = digits.slice(-4);
  const masked = '*'.repeat(Math.max(2, digits.length - 6));
  return `+${prefix} ${masked} ${suffix}`;
}

export async function sosRoute(app: FastifyInstance) {
  app.post<{ Body: SOSRequest }>(
    '/api/v1/sos',
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: '1 minute'
        }
      }
    },
    async (request: FastifyRequest<{ Body: SOSRequest }>, reply: FastifyReply) => {
      const parseResult = SOSSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid input',
          details: parseResult.error.issues
        });
      }

      const { phone, message, lat, lng } = parseResult.data;
      const cleanDigits = sanitizePhone(phone);

      // Validate 8 to 15 digits
      if (cleanDigits.length < 8 || cleanDigits.length > 15) {
        return reply.status(400).send({
          error: 'Invalid phone number',
          message: 'Phone number must be between 8 and 15 digits including country code.'
        });
      }

      let finalMessage = message.trim();
      if (lat !== undefined && lng !== undefined) {
        finalMessage += `\n📍 Current Location: https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
      }

      const encodedMessage = encodeURIComponent(finalMessage);
      const waUrl = `https://wa.me/${cleanDigits}?text=${encodedMessage}`;
      const smsUrl = `sms:${cleanDigits}?body=${encodedMessage}`;

      // Calculate privacy-safe hash for logging
      const phoneHash = createHash('sha256').update(cleanDigits).digest('hex').slice(0, 16);
      try {
        stmts.logSOS.run(phoneHash, Date.now());
      } catch (err) {
        request.log.warn({ err }, 'Could not log SOS audit');
      }

      const response: SOSResponse = {
        success: true,
        waUrl,
        smsUrl,
        message: finalMessage,
        phoneMasked: maskPhone(cleanDigits)
      };

      return reply.send(response);
    }
  );
}
