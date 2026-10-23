import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { stmts } from '../db.js';
import { PhraseItem } from '../types.js';

export const phrasesRouter = Router();

const PhraseSchema = z.object({
  id: z.string().min(1),
  emoji: z.string().min(1).max(8),
  phrase: z.string().min(1).max(200),
  category: z.enum(['basic', 'health', 'food', 'emotions', 'emergency', 'custom']).default('custom'),
  favorite: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0)
});

function getDeviceId(req: Request): string {
  const headerId = req.headers['x-device-id'];
  if (typeof headerId === 'string' && headerId.trim().length > 0) {
    return headerId.trim();
  }
  return 'default-device';
}

// GET phrases for device
phrasesRouter.get('/', (req: Request, res: Response) => {
  const deviceId = getDeviceId(req);
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

    res.json({ phrases });
  } catch (err: any) {
    console.error('Error fetching custom phrases:', err);
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST new phrase or upsert
phrasesRouter.post('/', (req: Request, res: Response) => {
  const deviceId = getDeviceId(req);
  const parseResult = PhraseSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
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
    res.status(201).json({ success: true, phrase: p });
  } catch (err: any) {
    console.error('Error saving phrase:', err);
    res.status(500).json({ error: 'Failed to save phrase' });
  }
});

// PUT update phrase
phrasesRouter.put('/:id', (req: Request, res: Response) => {
  const deviceId = getDeviceId(req);
  const { id } = req.params;
  const parseResult = PhraseSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
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
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error updating phrase:', err);
    res.status(500).json({ error: 'Failed to update phrase' });
  }
});

// DELETE phrase
phrasesRouter.delete('/:id', (req: Request, res: Response) => {
  const deviceId = getDeviceId(req);
  const { id } = req.params;
  try {
    stmts.deletePhrase.run(id, deviceId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting phrase:', err);
    res.status(500).json({ error: 'Failed to delete phrase' });
  }
});
