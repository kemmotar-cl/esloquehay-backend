import type { AIService } from '../services/ai';
import { generateRecipe } from '../services/ai';
import { recipeRequestSchema } from '../schemas';
import { sanitizeIngredients } from '../middleware/security';
import { log } from '../middleware/logger';

export async function handleRecipe(
  body: unknown,
  ai: AIService,
  meta: { clientIP: string; sessionId: string; path: string; startTime: number }
) {
  const { clientIP, sessionId, path, startTime } = meta;

  const parseResult = recipeRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    log('warn', 'validation_failed', { path, clientIP, sessionId, issues });
    return { success: false, error: 'Validation failed', details: issues, status: 400 };
  }

  const validated = parseResult.data;

  try {
    validated.ingredients = sanitizeIngredients(validated.ingredients);
  } catch {
    log('warn', 'prompt_injection_detected', { path, clientIP, sessionId });
    return { success: false, error: 'Invalid input detected', status: 422 };
  }

  try {
    const result = await generateRecipe(validated, ai);
    const duration = Date.now() - startTime;
    log('info', 'recipe_generated', { path, clientIP, sessionId, duration, ingredientsCount: validated.ingredients.length });
    return { success: true, data: result, status: 200 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    const isAIError = message.includes('IA') || message.includes('JSON');
    const status = isAIError ? 502 : 500;
    const duration = Date.now() - startTime;
    log('error', 'recipe_generation_failed', { path, clientIP, sessionId, duration, error: message });
    return { success: false, error: message, status };
  }
}
