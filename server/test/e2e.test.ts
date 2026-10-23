import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { Server as HttpServer } from 'node:http';
import { buildApp } from '../src/index.js';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;
let serverInstance: HttpServer;

beforeAll(async () => {
  const { server } = buildApp();
  await new Promise<void>((resolve) => {
    serverInstance = server.listen(PORT, '127.0.0.1', () => {
      resolve();
    });
  });
});

afterAll(async () => {
  if (serverInstance) {
    await new Promise<void>((resolve) => {
      serverInstance.close(() => resolve());
    });
  }
});

describe('ConnectPlus End-to-End Express API & Integration Tests', () => {
  it('serves static HTML index with proper title and meta tags', async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('ConnectPlus | Communication Without Barriers');
    expect(html).toContain('manifest.webmanifest');
    expect(html).toContain('favicon.svg');
  });

  it('Feature 1 & Health: reports uptime, version, and memory', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/health`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.version).toBe('1.0.0');
    expect(typeof data.uptime).toBe('number');
    expect(typeof data.memory.rss).toBe('number');
  });

  it('Feature 4: translates text and returns cached results', async () => {
    const payload = { text: 'Hello', target: 'ta' };
    const res1 = await fetch(`${BASE_URL}/api/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as any;
    expect(data1.translatedText).toBeTruthy();

    // Verify cache hit
    const res2 = await fetch(`${BASE_URL}/api/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as any;
    expect(data2.cached).toBe(true);
    expect(data2.translatedText).toBe(data1.translatedText);
  });

  it('Feature 8: AI assistant answers accessibility questions with suggestions', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I use the communication board?' })
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.answer).toContain('Sentence Builder Bar');
    expect(data.confidence).toBeGreaterThan(0.5);
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it('Feature 6: SOS validates phone number, attaches GPS, handles unconfigured gateway cleanly without fake success', async () => {
    const uniquePhone = '+91 98765' + Math.floor(10000 + Math.random() * 90000);
    const res = await fetch(`${BASE_URL}/api/v1/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: uniquePhone,
        message: 'Test emergency message',
        userName: 'Priya Sharma',
        lat: 13.0827,
        lng: 80.2707
      })
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;

    // Must clearly state that no gateway is configured rather than faking delivery
    expect(data.smsSent).toBe(false);
    expect(data.reason).toBe('NO_GATEWAY_CONFIGURED');
    expect(data.waUrl).toContain('https://wa.me/91');
    expect(data.smsUrl).toContain('sms:91');
    expect(data.message).toContain('From: Priya Sharma');
    expect(data.message).toContain('https://maps.google.com/?q=13.082700,80.270700');
    expect(data.phoneMasked).toContain('+91');
  });

  it('Feature 6: SOS rejects invalid phone numbers with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '1234', // invalid: under 8 digits
        message: 'Emergency help needed'
      })
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe('Invalid phone number');
  });

  it('Feature 6: SOS prevents duplicate requests within cooldown window', async () => {
    const phone = '+91 9998887776';
    const message = 'Duplicate test alert ' + Date.now();

    // First request
    const res1 = await fetch(`${BASE_URL}/api/v1/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    });
    expect(res1.status).toBe(200);

    // Immediate second duplicate request
    const res2 = await fetch(`${BASE_URL}/api/v1/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    });
    expect(res2.status).toBe(409);
    const data2 = (await res2.json()) as any;
    expect(data2.error).toBe('DUPLICATE_REQUEST');
  });

  it('Feature 2: custom phrases sync per device ID', async () => {
    const testDeviceId = 'test-dev-' + Date.now();
    const phraseItem = {
      id: 'test-p-' + Date.now(),
      emoji: '🌟',
      phrase: 'Testing custom phrase',
      category: 'custom',
      favorite: true,
      order: 1
    };

    // 1. Post phrase
    const postRes = await fetch(`${BASE_URL}/api/v1/phrases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': testDeviceId
      },
      body: JSON.stringify(phraseItem)
    });
    expect(postRes.status).toBe(201);

    // 2. Get phrases
    const getRes = await fetch(`${BASE_URL}/api/v1/phrases`, {
      headers: { 'x-device-id': testDeviceId }
    });
    expect(getRes.status).toBe(200);
    const getData = (await getRes.json()) as any;
    expect(getData.phrases.length).toBe(1);
    expect(getData.phrases[0].phrase).toBe('Testing custom phrase');
  });

  it('Feature 3: Live WebSocket room broadcasts captions', async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}/live`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'join', room: 'E2E1', speaker: 'Tester' }));
      });

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'join') {
          // Send caption
          ws.send(
            JSON.stringify({
              type: 'caption',
              room: 'E2E1',
              speaker: 'Tester',
              text: 'Live caption test message'
            })
          );
        } else if (msg.type === 'caption') {
          expect(msg.text).toBe('Live caption test message');
          expect(msg.speaker).toBe('Tester');
          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);
    });
  });
});
