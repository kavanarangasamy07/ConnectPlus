import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { stmts } from '../db.js';
import { SOSRequest, SOSResponse } from '../types.js';

export const sosRouter = Router();

const SOSSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  message: z.string().min(1).max(500),
  userName: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional()
});

export function sanitizePhone(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  return digits;
}

export function maskPhone(digits: string): string {
  if (!digits || digits.length <= 4) return '****';
  const prefix = digits.slice(0, 2);
  const suffix = digits.slice(-4);
  const stars = '*'.repeat(Math.max(2, digits.length - 6));
  return `+${prefix} ${stars} ${suffix}`;
}

// In-memory duplicate request tracker (prevents duplicate dispatches within 20s)
const recentRequests = new Map<string, number>();

function cleanOldRequests() {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests.entries()) {
    if (now - timestamp > 20000) {
      recentRequests.delete(key);
    }
  }
}

sosRouter.post('/', async (req: Request, res: Response) => {
  cleanOldRequests();

  const parseResult = SOSSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parseResult.error.issues
    });
  }

  const { phone, message, userName, lat, lng } = parseResult.data;
  const cleanDigits = sanitizePhone(phone);

  if (cleanDigits.length < 8 || cleanDigits.length > 15) {
    return res.status(400).json({
      error: 'Invalid phone number',
      message: 'Phone number must be between 8 and 15 digits including country code.'
    });
  }

  // Duplicate request check
  const dedupeKey = `${cleanDigits}:${message.trim()}:${userName || ''}`;
  const now = Date.now();
  if (recentRequests.has(dedupeKey)) {
    const elapsed = now - recentRequests.get(dedupeKey)!;
    if (elapsed < 20000) {
      return res.status(409).json({
        error: 'DUPLICATE_REQUEST',
        message: 'A duplicate SOS dispatch was prevented. Please wait before retrying.',
        cooldownRemainingMs: 20000 - elapsed
      });
    }
  }
  recentRequests.set(dedupeKey, now);

  // Compile final message
  let finalMessage = '';
  if (userName && userName.trim()) {
    finalMessage += `[From: ${userName.trim()}]\n`;
  }
  finalMessage += message.trim();

  if (lat !== undefined && lng !== undefined) {
    finalMessage += `\n📍 Current Location: https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  }

  const encodedMessage = encodeURIComponent(finalMessage);
  const waUrl = `https://wa.me/${cleanDigits}?text=${encodedMessage}`;
  const smsUrl = `sms:${cleanDigits}?body=${encodedMessage}`;

  // Audit log with SHA-256 hash for privacy
  const phoneHash = createHash('sha256').update(cleanDigits).digest('hex').slice(0, 16);
  try {
    stmts.logSOS.run(phoneHash, now);
  } catch (err) {
    console.warn('Could not log SOS audit:', err);
  }

  // Check SMS Gateway configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  const genericGatewayUrl = process.env.SMS_GATEWAY_URL;

  let smsSent = false;
  let providerMessageId: string | undefined;
  let providerName: string | undefined;
  let failureReason: 'NO_GATEWAY_CONFIGURED' | 'PROVIDER_ERROR' | undefined;
  let providerError: string | undefined;

  if (twilioSid && twilioToken && twilioFrom) {
    providerName = 'Twilio';
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', `+${cleanDigits}`);
      bodyParams.append('From', twilioFrom);
      bodyParams.append('Body', finalMessage);

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: bodyParams.toString()
        }
      );

      const twilioData = (await twilioRes.json()) as any;
      if (twilioRes.ok && twilioData && twilioData.sid) {
        smsSent = true;
        providerMessageId = twilioData.sid;
      } else {
        failureReason = 'PROVIDER_ERROR';
        providerError = twilioData?.message || `Twilio HTTP ${twilioRes.status}`;
      }
    } catch (err: any) {
      failureReason = 'PROVIDER_ERROR';
      providerError = err.message || 'Twilio request failed';
    }
  } else if (genericGatewayUrl) {
    providerName = 'CustomGateway';
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (process.env.SMS_GATEWAY_AUTH_HEADER && process.env.SMS_GATEWAY_AUTH_VALUE) {
        headers[process.env.SMS_GATEWAY_AUTH_HEADER] = process.env.SMS_GATEWAY_AUTH_VALUE;
      }

      const gatewayRes = await fetch(genericGatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: `+${cleanDigits}`,
          message: finalMessage,
          userName: userName || null
        })
      });

      if (gatewayRes.ok) {
        const gwData = (await gatewayRes.json().catch(() => ({}))) as any;
        smsSent = true;
        providerMessageId = gwData?.id || gwData?.messageId || 'gw-' + Date.now();
      } else {
        failureReason = 'PROVIDER_ERROR';
        providerError = `Gateway returned HTTP ${gatewayRes.status}`;
      }
    } catch (err: any) {
      failureReason = 'PROVIDER_ERROR';
      providerError = err.message || 'Gateway connection failed';
    }
  } else {
    failureReason = 'NO_GATEWAY_CONFIGURED';
  }

  const response: SOSResponse = {
    success: smsSent, // true ONLY if SMS gateway accepted request
    smsSent,
    reason: failureReason,
    error: providerError,
    messageId: providerMessageId,
    provider: providerName,
    waUrl,
    smsUrl,
    message: finalMessage,
    preparedMessage: finalMessage,
    phoneMasked: maskPhone(cleanDigits)
  };

  return res.status(smsSent ? 200 : 200).json(response);
});
