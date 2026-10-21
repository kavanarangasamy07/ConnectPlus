import { z } from 'zod';
import { matchFAQ } from '../faq.js';
const AssistantSchema = z.object({
    message: z.string().min(1).max(1000),
    history: z
        .array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
    }))
        .optional()
});
export async function assistantRoute(app) {
    app.post('/api/v1/assistant', {
        config: {
            rateLimit: {
                max: 40,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const parseResult = AssistantSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Invalid input',
                details: parseResult.error.issues
            });
        }
        const { message } = parseResult.data;
        // 1. Fuzzy FAQ match for instantaneous local answer
        const match = matchFAQ(message);
        if (match && match.confidence >= 0.4) {
            const response = {
                answer: match.item.answer,
                confidence: match.confidence,
                source: 'faq',
                suggestions: match.item.suggestions
            };
            return reply.send(response);
        }
        // 2. Check if LLM API key is configured in environment
        const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
            try {
                // If external LLM key is configured, query Gemini/LLM API
                const prompt = `You are ConnectPlus AI Assistant, an empathetic accessibility guide for deaf, hard-of-hearing, and speech-impaired individuals. Answer clearly, concisely, and helpfully:\nQuestion: ${message}`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                if (res.ok) {
                    const data = (await res.json());
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        const response = {
                            answer: text,
                            confidence: 0.95,
                            source: 'llm',
                            suggestions: ['How to use the board?', 'Can I use this offline?', 'How does SOS work?']
                        };
                        return reply.send(response);
                    }
                }
            }
            catch (llmErr) {
                request.log.warn({ llmErr }, 'LLM fallback failed, falling back to smart assistance');
            }
        }
        // 3. Fallback response with helpful accessibility hints
        const response = {
            answer: "I'm here to assist you with ConnectPlus! You can use our Speech-to-Text for live captions, Text-to-Speech to voice your thoughts, the Communication Board for quick phrases, Multilingual Translation, or Emergency SOS.",
            confidence: 0.5,
            source: 'faq',
            suggestions: [
                'How do I use the board?',
                'How does Two-Way Communication work?',
                'How do Live Captions work?',
                'How does Emergency SOS work?'
            ]
        };
        return reply.send(response);
    });
}
