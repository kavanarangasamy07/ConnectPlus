import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { matchFAQ } from '../faq.js';
import { AssistantResponse } from '../types.js';

export const assistantRouter = Router();

const AssistantSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })
    )
    .optional()
});

assistantRouter.post('/', async (req: Request, res: Response) => {
  const parseResult = AssistantSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parseResult.error.issues
    });
  }

  const { message } = parseResult.data;

  // 1. Fuzzy FAQ match for instantaneous local answer
  const match = matchFAQ(message);
  if (match && match.confidence >= 0.35) {
    const response: AssistantResponse = {
      answer: match.item.answer,
      confidence: match.confidence,
      source: 'faq',
      suggestions: match.item.suggestions
    };
    return res.json(response);
  }

  // 2. Check if LLM API key is configured in environment
  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are ConnectPlus AI Assistant, an empathetic accessibility guide for deaf, hard-of-hearing, and speech-impaired individuals. Answer clearly, concisely, and helpfully:\nQuestion: ${message}`;
      const llmRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      if (llmRes.ok) {
        const data = (await llmRes.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const response: AssistantResponse = {
            answer: text,
            confidence: 0.95,
            source: 'llm',
            suggestions: [
              'How to use the board?',
              'How does Sudden Shake & Noise Detection work?',
              'How does Emergency SOS SMS work?'
            ]
          };
          return res.json(response);
        }
      }
    } catch (llmErr) {
      console.warn('LLM query failed, falling back to smart assistance:', llmErr);
    }
  }

  // 3. Fallback response with helpful accessibility hints
  const response: AssistantResponse = {
    answer:
      "I'm here to assist you with ConnectPlus! You can use Speech-to-Text for live captions, Text-to-Speech to voice your thoughts, the Communication Board for ready phrase tiles, Sudden Shake and Loud Noise detection for sensory alerts, Multilingual Translation (English, Tamil, Telugu, Malayalam, Kannada), or Emergency SOS SMS.",
    confidence: 0.5,
    source: 'faq',
    suggestions: [
      'How do I use the Communication Board?',
      'How does Sudden Shake & Noise Detection work?',
      'How does Emergency SOS work?',
      'Which languages are supported?'
    ]
  };
  return res.json(response);
});
