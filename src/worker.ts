import { buildRecipePrompt, buildItineraryPrompt, parseAIResponse } from './prompts';
import type { RecipeResult, RecipeRequest, ItineraryRequest } from './types';

export interface Env {
  KIMI_API_KEY: string;
  KIMI_BASE_URL?: string;
  KIMI_MODEL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function callKimi(prompt: string, env: Env): Promise<string> {
  const baseUrl = env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
  const model = env.KIMI_MODEL || 'kimi-k2.6';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Sos un asistente experto que SIEMPRE devuelve JSON válido sin texto adicional.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${response.status} — ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? '';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return jsonResponse({
        status: 'ok',
        model: env.KIMI_MODEL || 'kimi-k2.6',
        keyConfigured: !!env.KIMI_API_KEY,
      });
    }

    // Recipe generation
    if (url.pathname === '/api/recipe' && request.method === 'POST') {
      try {
        const body = await request.json() as RecipeRequest;
        const prompt = buildRecipePrompt(body);
        const aiText = await callKimi(prompt, env);
        const parsed = parseAIResponse(aiText) as RecipeResult;
        parsed.id = Date.now().toString();
        return jsonResponse({ success: true, data: parsed });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        return jsonResponse({ success: false, error: message }, 500);
      }
    }

    // Itinerary generation
    if (url.pathname === '/api/itinerary' && request.method === 'POST') {
      try {
        const body = await request.json() as ItineraryRequest;
        const prompt = buildItineraryPrompt(body);
        const aiText = await callKimi(prompt, env);
        const parsed = parseAIResponse(aiText) as RecipeResult;
        parsed.id = Date.now().toString();
        return jsonResponse({ success: true, data: parsed });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        return jsonResponse({ success: false, error: message }, 500);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
