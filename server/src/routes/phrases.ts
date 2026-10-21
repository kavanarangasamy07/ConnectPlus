import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { stmts } from '../db.js';
import { PhraseItem } from '../types.js';

const PhraseSchema = z.object({
  id: z.string().min(1),
  emoji: z.string().min(1).max(8),
  phrase: z.string().min(1).max(200),
  category: z.enum(['basic', 'health', 'food', 'emotions', 'emergency', 'custom']).default('custom'),
  favorite: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0)
});

function getDeviceId(request: FastifyRequest): string {
  const headerId = request.headers['x-device-id'];
  if (typeof headerId === 'string' && headerId.trim().length > 0) {
    return headerId.trim();
  }
  return 'default-device';
}

export async function phrasesRoute(app: FastifyInstance) {
  // GET phrases for device
  app.get('/api/v1/phrases', async (request: FastifyRequest, reply: FastifyReply) => {
    const deviceId = getDeviceId(request);
    try {
      const rows = stmts.getPhrasesByDevice.all(deviceId) as Array<{
        id: string;
        emoji: string;
        phrase: string;
        category: string;
        favorite: number;
        sort_order: number;
        created_at: number;
      }>;

      const phrases: PhraseItem[] = rows.map((r) => ({
        id: r.id,
        emoji: r.emoji,
        phrase: r.phrase,
        category: r.category as any,
        favorite: Boolean(r.favorite),
        order: r.sort_order,
        createdAt: r.created_at
      }));

      return reply.send({ phrases });
    } catch (err: any) {
      request.log.error({ err }, 'Error fetching custom phrases');
      return reply.status(500).send({ error: 'Database error', message: err.message });
    }
  });

  // POST new phrase or upsert
  app.post<{ Body: PhraseItem }>(
    '/api/v1/phrases',
    async (request: FastifyRequest<{ Body: PhraseItem }>, reply: FastifyReply) => {
      const deviceId = getDeviceId(request);
      const parseResult = PhraseSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid input',
          details: parseResult.error.issues
        });
      }

      const p = parseResult.data;
      try {
        stmts.upsertPhrase.run(
          p.id,
          deviceId,
          p.emoji,
          p.phrase,
          p.category,
          p.favorite ? 1 : 0,
          p.order || 0,
          Date.now()
        );
        return reply.status(201).send({ success: true, phrase: p });
      } catch (err: any) {
        request.log.error({ err }, 'Error saving phrase');
        return reply.status(500).send({ error: 'Failed to save phrase' });
      }
    }
  );

  // PUT update phrase
  app.put<{ Params: { id: string }; Body: Partial<PhraseItem> }>(
    '/api/v1/phrases/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: Partial<PhraseItem> }>,
      reply: FastifyReply
    ) => {
      const deviceId = getDeviceId(request);
      const { id } = request.params;
      const parseResult = PhraseSchema.partial().safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid input',
          details: parseResult.error.issues
        });
      }

      const p = parseResult.data;
      try {
        stmts.upsertPhrase.run(
          id,
          deviceId,
          p.emoji || '💬',
          p.phrase || '',
          p.category || 'custom',
          p.favorite ? 1 : 0,
          p.order || 0,
          Date.now()
        );
        return reply.send({ success: true });
      } catch (err: any) {
        request.log.error({ err }, 'Error updating phrase');
        return reply.status(500).send({ error: 'Failed to update phrase' });
      }
    }
  );

  // DELETE phrase
  app.delete<{ Params: { id: string } }>(
    '/api/v1/phrases/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const deviceId = getDeviceId(request);
      const { id } = request.params;
      try {
        stmts.deletePhrase.run(id, deviceId);
        return reply.send({ success: true });
      } catch (err: any) {
        request.log.error({ err }, 'Error deleting phrase');
        return reply.status(500).send({ error: 'Failed to delete phrase' });
      }
    }
  );
}
