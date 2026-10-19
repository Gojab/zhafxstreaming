import { executeMultiModelChat } from '../server/aiPipeline.ts';

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check / GET support
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Zhafx Multi-Provider AI Engine (16 Models Active)',
      configured: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      modelsAvailable: [
        'gemini-2.5-flash',
        'gemini-3.8-flash',
        'gemini-2.0-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gpt-4o-mini',
        'deepseek-v3',
        'mistral-nemo',
        'llama-3.3-70b',
        'qwen-2.5-72b',
        'searchgpt',
        'claude-hybrid',
      ],
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // use raw
    }
  }

  const { message, history, contextTitle } = body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  // Enable Server-Sent Events (SSE) streaming for Vercel
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  try {
    await executeMultiModelChat(
      {
        message,
        history,
        contextTitle,
        geminiApiKey,
      },
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[Vercel AI Handler Error]:', err);
    res.write(`data: ${JSON.stringify({ text: 'Maaf, terjadi gangguan saat memproses jawaban. Silakan coba kembali sesaat lagi.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
}
