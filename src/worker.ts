import { buildRecipePrompt, buildItineraryPrompt, parseAIResponse } from './prompts';
import type { RecipeResult, RecipeRequest, ItineraryRequest } from './types';

export interface Env {
  AI: {
    run(
      model: string,
      inputs: { messages: Array<{ role: string; content: string }> }
    ): Promise<{ response?: string; content?: string }>;
  };
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

async function callAI(prompt: string, env: Env): Promise<string> {
  const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content:
          'You are a traditional cuisine expert assistant. You ALWAYS return valid JSON without any additional text, markdown, or explanations. When asked for a recipe, you suggest real, known traditional dishes adapted to available ingredients. Never invent fictional dishes.',
      },
      { role: 'user', content: prompt },
    ],
  });

  // Workers AI puede devolver response o content según el modelo
  const text =
    (result as { response?: string }).response ??
    (result as { content?: string }).content ??
    (typeof result === 'string' ? result : '');

  if (!text) {
    throw new Error('La IA no devolvió contenido');
  }

  return text;
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
        model: '@cf/meta/llama-3.1-8b-instruct',
        source: 'cloudflare-workers-ai',
        keyConfigured: true,
      });
    }

    // Recipe generation
    if (url.pathname === '/api/recipe' && request.method === 'POST') {
      try {
        const body = (await request.json()) as RecipeRequest;
        const prompt = buildRecipePrompt(body);
        const aiText = await callAI(prompt, env);
        const parsed = parseAIResponse(aiText) as RecipeResult;
        parsed.id = Date.now().toString();
        return jsonResponse({ success: true, data: parsed });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error desconocido';
        return jsonResponse({ success: false, error: message }, 500);
      }
    }

    // Itinerary generation
    if (url.pathname === '/api/itinerary' && request.method === 'POST') {
      try {
        const body = (await request.json()) as ItineraryRequest;
        const prompt = buildItineraryPrompt(body);
        const aiText = await callAI(prompt, env);
        const parsed = parseAIResponse(aiText) as RecipeResult;
        parsed.id = Date.now().toString();
        return jsonResponse({ success: true, data: parsed });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error desconocido';
        return jsonResponse({ success: false, error: message }, 500);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
