import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { buildRecipePrompt, buildItineraryPrompt, parseAIResponse } from './prompts';
import type { RecipeResult, RecipeRequest, ItineraryRequest } from './types';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
const KIMI_MODEL = process.env.KIMI_MODEL || 'kimi-k2.6';

async function callKimi(prompt: string): Promise<string> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY no configurada. Copiá .env.example a .env y agregá tu key.');
  }

  const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages: [
        { role: 'system', content: 'You are a traditional cuisine expert assistant. You ALWAYS return valid JSON without any additional text, markdown, or explanations. When asked for a recipe, you suggest real, known traditional dishes adapted to available ingredients. Never invent fictional dishes.' },
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

app.post('/api/recipe', async (req, res) => {
  try {
    const body = req.body as RecipeRequest;
    const prompt = buildRecipePrompt(body);
    const aiText = await callKimi(prompt);
    const parsed = parseAIResponse(aiText) as RecipeResult;

    // Agregar ID único
    parsed.id = Date.now().toString();

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Recipe error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});

app.post('/api/itinerary', async (req, res) => {
  try {
    const body = req.body as ItineraryRequest;
    const prompt = buildItineraryPrompt(body);
    const aiText = await callKimi(prompt);
    const parsed = parseAIResponse(aiText) as RecipeResult;

    parsed.id = Date.now().toString();

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Itinerary error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: KIMI_MODEL, keyConfigured: !!KIMI_API_KEY });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍳 EsLoQueHay Backend corriendo en http://localhost:${PORT}`);
  console.log(`   POST /api/recipe    — Generar receta`);
  console.log(`   POST /api/itinerary — Generar itinerario`);
  console.log(`   GET  /api/health    — Estado del servicio`);
  console.log(KIMI_API_KEY ? '   ✅ API Key configurada' : '   ⚠️  API Key NO configurada — copiá .env.example a .env');
});
