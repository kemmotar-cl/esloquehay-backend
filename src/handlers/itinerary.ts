import type { AIService } from '../services/ai';
import { generateItinerary } from '../services/ai';
import { itineraryRequestSchema } from '../schemas';
import { sanitizeIngredients } from '../middleware/security';
import { log } from '../middleware/logger';

export async function handleItinerary(
  body: unknown,
  ai: AIService,
  meta: { clientIP: string; sessionId: string; path: string; startTime: number }
) {
  const { clientIP, sessionId, path, startTime } = meta;

  const parseResult = itineraryRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    log('warn', 'validation_failed', { path, clientIP, sessionId, issues });
    return { success: false, error: 'Validation failed', details: issues, status: 400 };
  }

  const validated = parseResult.data;

  try {
    validated.elements = sanitizeIngredients(validated.elements);
  } catch {
    log('warn', 'prompt_injection_detected', { path, clientIP, sessionId });
    return { success: false, error: 'Invalid input detected', status: 422 };
  }

  try {
    const result = await generateItinerary(validated, ai);
    const duration = Date.now() - startTime;
    log('info', 'itinerary_generated', { path, clientIP, sessionId, duration });
    return { success: true, data: result, status: 200 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    const isAIError = message.includes('IA') || message.includes('JSON');
    const status = isAIError ? 502 : 500;
    const duration = Date.now() - startTime;
    log('error', 'itinerary_generation_failed', { path, clientIP, sessionId, duration, error: message });
    return { success: false, error: message, status };
  }
}
