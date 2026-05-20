import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createKimiAIService } from './services/ai';
import { handleRecipe } from './handlers/recipe';
import { handleItinerary } from './handlers/itinerary';
import { handleHealth } from './handlers/health';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = createKimiAIService();

app.post('/api/recipe', async (req, res) => {
  const meta = {
    clientIP: req.ip ?? 'unknown',
    sessionId: (req.headers['x-session-id'] as string) ?? 'anonymous',
    path: req.path,
    startTime: Date.now(),
  };
  const result = await handleRecipe(req.body, ai, meta);
  res.status(result.status ?? 200).json(result);
});

app.post('/api/itinerary', async (req, res) => {
  const meta = {
    clientIP: req.ip ?? 'unknown',
    sessionId: (req.headers['x-session-id'] as string) ?? 'anonymous',
    path: req.path,
    startTime: Date.now(),
  };
  const result = await handleItinerary(req.body, ai, meta);
  res.status(result.status ?? 200).json(result);
});

app.get('/api/health', (_req, res) => {
  const result = handleHealth({
    clientIP: _req.ip ?? 'unknown',
    sessionId: (_req.headers['x-session-id'] as string) ?? 'anonymous',
    path: _req.path,
  });
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍳 EsLoQueHay Backend corriendo en http://localhost:${PORT}`);
  console.log(`   POST /api/recipe    — Generar receta`);
  console.log(`   POST /api/itinerary — Generar itinerario`);
  console.log(`   GET  /api/health    — Estado del servicio`);
});
