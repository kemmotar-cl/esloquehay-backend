import type { Env as AiEnv } from './services/ai';
import { createWorkersAIService } from './services/ai';
import { handleRecipe } from './handlers/recipe';
import { handleItinerary } from './handlers/itinerary';
import { handleHealth } from './handlers/health';
import { getCorsHeaders } from './middleware/cors';
import { checkRateLimit } from './middleware/rateLimit';
import { log } from './middleware/logger';

export interface Env extends AiEnv {
  CACHE?: KVNamespace;
}

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...headers,
    },
  });
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
        { ...corsHeaders, 'Retry-After': String(rateCheck.retryAfter ?? 60) }
      );
    }

    // Health check
    if (path === '/api/health' && request.method === 'GET') {
      const result = handleHealth({ path, clientIP, sessionId });
      return jsonResponse(result, 200, corsHeaders);
    }

    const ai = createWorkersAIService(env);
    const meta = { path, clientIP, sessionId, startTime };

    // Recipe generation
    if (path === '/api/recipe' && request.method === 'POST') {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        log('warn', 'invalid_json', { path, clientIP, sessionId });
        return jsonResponse({ success: false, error: 'Invalid JSON in request body' }, 400, corsHeaders);
      }

      // Check KV cache
      const cacheKey = body && typeof body === 'object'
        ? `recipe:${JSON.stringify(body)}`
        : null;
      if (cacheKey && env.CACHE) {
        try {
          const cached = await env.CACHE.get(cacheKey);
          if (cached) {
            log('info', 'recipe_cache_hit', { path, clientIP, sessionId });
            return jsonResponse({ success: true, data: JSON.parse(cached) }, 200, corsHeaders);
          }
        } catch {
          // ignore cache errors
        }
      }

      const result = await handleRecipe(body, ai, meta);

      // Store in KV cache
      if (result.success && result.data && cacheKey && env.CACHE) {
        try {
          await env.CACHE.put(cacheKey, JSON.stringify(result.data), { expirationTtl: 3600 });
        } catch {
          // ignore cache errors
        }
      }

      return jsonResponse(result, result.status ?? 200, corsHeaders);
    }

    // Itinerary generation
    if (path === '/api/itinerary' && request.method === 'POST') {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        log('warn', 'invalid_json', { path, clientIP, sessionId });
        return jsonResponse({ success: false, error: 'Invalid JSON in request body' }, 400, corsHeaders);
      }

      const result = await handleItinerary(body, ai, meta);
      return jsonResponse(result, result.status ?? 200, corsHeaders);
    }

    log('warn', 'not_found', { path, clientIP, sessionId });
    return jsonResponse({ success: false, error: 'Not found' }, 404, corsHeaders);
  },
};
