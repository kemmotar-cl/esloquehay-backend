import { buildRecipePrompt, buildItineraryPrompt, parseAIResponse } from '../prompts';
import type { RecipeResult, RecipeRequest, ItineraryRequest } from '../types';

export interface AIService {
  generate(prompt: string): Promise<string>;
}

// Cloudflare Workers AI implementation
export function createWorkersAIService(env: { AI: { run: (model: string, inputs: unknown) => Promise<{ response?: string; content?: string }> } }): AIService {
  return {
    async generate(prompt: string): Promise<string> {
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
    },
  };
}

// Kimi/Moonshot API implementation (for Express dev server)
export function createKimiAIService(): AIService {
  const apiKey = process.env.KIMI_API_KEY;
  const baseUrl = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
  const model = process.env.KIMI_MODEL || 'kimi-k2.6';

  return {
    async generate(prompt: string): Promise<string> {
      if (!apiKey) {
        throw new Error('KIMI_API_KEY no configurada');
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a traditional cuisine expert assistant. You ALWAYS return valid JSON without any additional text, markdown, or explanations. When asked for a recipe, you suggest real, known traditional dishes adapted to available ingredients. Never invent fictional dishes.',
            },
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

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0]?.message?.content ?? '';
    },
  };
}

// Shared generation logic
export async function generateRecipe(
  request: RecipeRequest,
  ai: AIService
): Promise<RecipeResult> {
  const prompt = buildRecipePrompt(request);
  const aiText = await ai.generate(prompt);
  const parsed = parseAIResponse(aiText) as RecipeResult;
  parsed.id = Date.now().toString();
  return parsed;
}

export async function generateItinerary(
  request: ItineraryRequest,
  ai: AIService
): Promise<RecipeResult> {
  const prompt = buildItineraryPrompt(request);
  const aiText = await ai.generate(prompt);
  const parsed = parseAIResponse(aiText) as RecipeResult;
  parsed.id = Date.now().toString();
  return parsed;
}
