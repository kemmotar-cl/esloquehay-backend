import { buildRecipePrompt, buildItineraryPrompt, parseAIResponse } from './prompts';
import type { RecipeResult, RecipeRequest, ItineraryRequest } from './types';
import { recipeRequestSchema, itineraryRequestSchema } from './schemas';
import { ZodError } from 'zod';

export interface Env {
  AI: {
    run(
      model: string,
      inputs: { messages: Array<{ role: string; content: string }> }
    ): Promise<{ response?: string; content?: string }>;
  };
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://esloquehay.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// Simple structured logger compatible with Cloudflare Logpush
function log(
  level: 'info' | 'warn' | 'error',
  event: string,
  meta?: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

// Rate limiter (in-memory, per-isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

// Prompt injection detection
const INJECTION_PATTERNS = [
  /ignore\s+previous/i,
  /forget\s+(everything|all|previous)/i,
  /system\s+prompt/i,
  /instruction\s*:/i,
  /you\s+are\s+now/i,
  /new\s+role\s*:/i,
  /disregard\s+(all|previous)/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

function sanitizeIngredients(ingredients: string[]): string[] {
  return ingredients.map((ing) => {
    const trimmed = ing.trim().slice(0, 100);
    if (containsInjection(trimmed)) {
      throw new Error('Invalid input detected');
    }
    return trimmed;
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
  } as unknown as Parameters<typeof env.AI.run>[1]);

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
    const corsHeaders = getCorsHeaders(request);
    const sessionId = request.headers.get('X-Session-ID') ?? 'anonymous';
    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const startTime = Date.now();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Rate limiting
    const rateCheck = checkRateLimit(clientIP);
    if (!rateCheck.allowed) {
      log('warn', 'rate_limit_exceeded', { path, clientIP, sessionId });
      return jsonResponse(
        { success: false, error: 'Too many requests. Please try again later.' },
        429,
        {
          ...corsHeaders,
          'Retry-After': String(rateCheck.retryAfter ?? 60),
        }
      );
    }

    // Health check
    if (path === '/api/health' && request.method === 'GET') {
      log('info', 'health_check', { path, clientIP, sessionId });
      return jsonResponse(
        {
          status: 'ok',
          model: '@cf/meta/llama-3.1-8b-instruct',
          source: 'cloudflare-workers-ai',
          keyConfigured: true,
        },
        200,
        corsHeaders
      );
    }

    // Recipe generation
    if (path === '/api/recipe' && request.method === 'POST') {
      try {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          log('warn', 'invalid_json', { path, clientIP, sessionId });
          return jsonResponse(
            { success: false, error: 'Invalid JSON in request body' },
            400,
            corsHeaders
          );
        }

        const parseResult = recipeRequestSchema.safeParse(body);
        if (!parseResult.success) {
          const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
          log('warn', 'validation_failed', { path, clientIP, sessionId, issues });
          return jsonResponse(
            { success: false, error: 'Validation failed', details: issues },
            400,
            corsHeaders
          );
        }

        const validated = parseResult.data;

        // Sanitize and check for prompt injection
        try {
          validated.ingredients = sanitizeIngredients(validated.ingredients);
        } catch {
          log('warn', 'prompt_injection_detected', { path, clientIP, sessionId });
          return jsonResponse(
            { success: false, error: 'Invalid input detected' },
            422,
            corsHeaders
          );
        }

        const prompt = buildRecipePrompt(validated as RecipeRequest);
        const aiText = await callAI(prompt, env);
        const parsed = parseAIResponse(aiText) as RecipeResult;
        parsed.id = Date.now().toString();

        const duration = Date.now() - startTime;
        log('info', 'recipe_generated', { path, clientIP, sessionId, duration, ingredientsCount: validated.ingredients.length });

        return jsonResponse({ success: true, data: parsed }, 200, corsHeaders);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        const isAIError = message.includes('IA') || message.includes('JSON');
        const status = isAIError ? 502 : 500;
        const duration = Date.now() - startTime;
        log('error', 'recipe_generation_failed', { path, clientIP, sessionId, duration, error: message });
        return jsonResponse({ success: false, error: message }, status, corsHeaders);
      }
    }

    // Itinerary generation
    if (path === '/api/itinerary' && request.method === 'POST') {
      try {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          log('warn', 'invalid_json', { path, clientIP, sessionId });
          return jsonResponse(
            { success: false, error: 'Invalid JSON in request body' },
            400,
            corsHeaders
          );
        }

        const parseResult = itineraryRequestSchema.safeParse(body);
        if (!parseResult.success) {
          const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
          log('warn', 'validation_failed', { path, clientIP, sessionId, issues });
          return jsonResponse(
            { success: false, error: 'Validation failed', details: issues },
            400,
            corsHeaders
          );
        }

        const validated = parseResult.data;

        try {
          validated.elements = sanitizeIngredients(validated.elements);
        } catch {
          log('warn', 'prompt_injection_detected', { path, clientIP, sessionId });
          return jsonResponse(
            { success: false, error: 'Invalid input detected' },
            422,
            corsHeaders
          );
        }

        const prompt = buildItineraryPrompt(validated as ItineraryRequest);
        const aiText = await callAI(prompt, env);
        const parsed = parseAIResponse(aiText) as RecipeResult;
        parsed.id = Date.now().toString();

        const duration = Date.now() - startTime;
        log('info', 'itinerary_generated', { path, clientIP, sessionId, duration });

        return jsonResponse({ success: true, data: parsed }, 200, corsHeaders);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        const isAIError = message.includes('IA') || message.includes('JSON');
        const status = isAIError ? 502 : 500;
        const duration = Date.now() - startTime;
        log('error', 'itinerary_generation_failed', { path, clientIP, sessionId, duration, error: message });
        return jsonResponse({ success: false, error: message }, status, corsHeaders);
      }
    }

    log('warn', 'not_found', { path, clientIP, sessionId });
    return jsonResponse({ success: false, error: 'Not found' }, 404, corsHeaders);
  },
};
