import type { RecipeRequest, ItineraryRequest } from './types';

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'español neutro/latino',
  en: 'English',
  zh: '中文',
  hi: 'हिन्दी',
  ar: 'العربية',
  fr: 'français',
  bn: 'বাংলা',
  pt: 'português',
  ru: 'русский',
  ur: 'اردو',
  id: 'Bahasa Indonesia',
  de: 'Deutsch',
  ja: '日本語',
  vi: 'Tiếng Việt',
  tr: 'Türkçe',
  yo: 'Yorùbá',
  mr: 'मराठी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  ko: '한국어',
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

export function buildRecipePrompt(req: RecipeRequest): string {
  const {
    ingredients,
    country,
    flavorProfile = 'tradicional',
    skillLevel = 'intermedio',
    servings = 2,
    maxPrepTime = 45,
    additionalIngredient = '',
    budget = 'medium',
    language = 'es',
  } = req;

  const allIngredients = additionalIngredient
    ? [...ingredients, additionalIngredient]
    : ingredients;

  const budgetInstructions =
    budget === 'low'
      ? 'Presupuesto ECONÓMICO: la persona tiene pocos recursos. La receta debe usar MÍNIMO de ingredientes, ser muy simple, sin ingredientes caros o difíciles de conseguir. Prioriza sustanciosidad y sabor con lo básico. No uses vino, hierbas exoticas, ni técnicas complejas.'
      : budget === 'high'
        ? 'Presupuesto SIN LÍMITE: puedes sugerir ingredientes extra de calidad, técnicas avanzadas, y presentación de restaurante.'
        : 'Presupuesto BALANCEADO: receta realista para el día a día.';

  const langName = getLanguageName(language);
  const languageInstructions =
    language === 'es'
      ? 'TODA la receta debe estar en español neutro/latino: título, descripción, pasos, tips, variaciones, maridaje, emplatado. Usa "tienes", "puedes", "sirve".'
      : `TODA la receta debe estar COMPLETAMENTE en ${langName}: título, descripción, pasos, tips, variaciones, maridaje, emplatado. No uses español ni inglés en ningún campo. Adapta el tono culturalmente al idioma y región.`;

  return `Eres un chef tradicional experto en gastronomía latinoamericana e internacional. Vas a sugerir una receta CONOCIDA y tradicional del país o región indicada, ligeramente adaptada para que se pueda preparar usando principalmente estos ingredientes que la persona ya tiene: ${allIngredients.join(', ')}.

Contexto:
- País/región: ${country}
- Perfil de sabor: ${flavorProfile}
- Nivel de cocina: ${skillLevel}
- Comensales: ${servings}
- Tiempo máximo total: ${maxPrepTime} minutos
- ${budgetInstructions}
- ${languageInstructions}

REGLAS ESTRICTAS:
1. SUGIERE una receta REAL y CONOCIDA (ej: arroz con pollo, paella, risotto, ceviche, mole, pasta al pesto, etc.). NO inventes platos nuevos. Si no existe una receta tradicional exacta con esos ingredientes, elige la más cercana posible y adáptala ligeramente.
2. Menciona el nombre tradicional del plato en el título.
3. Usa la MAYOR CANTIDAD POSIBLE de los ingredientes listados, pero NO fuerces ninguno si no encaja naturalmente en la receta tradicional. Puedes omitir algunos ingredientes si la preparación quedaría forzada o extraña. Siempre prioriza que el plato sea reconocible y apetitoso sobre usar todos los ingredientes. Puedes usar agua, sal, pimienta, aceite básico sin contarlos.
4. Incluye tips gourmet que elevarían el plato, pero manteniendo la esencia de la receta tradicional.
5. Genera 3 VARIACIONES LIGERAS de la misma receta tradicional (por ejemplo: al horno, a la sartén, con un toque regional diferente, o versión vegetariana).

DEVUELVE EXACTAMENTE este JSON, sin markdown, sin explicaciones previas, SOLO el JSON:

{
  "title": "Nombre tradicional del plato (adaptado)",
  "description": "Descripción de 1-2 oraciones que vende la experiencia",
  "experience": "Frase corta evocativa del tipo de experiencia (ej: 'Comfort food que abraza el alma')",
  "ingredients": ["cantidad + ingrediente 1", "cantidad + ingrediente 2", ...],
  "steps": ["Paso 1 detallado", "Paso 2 detallado", ...],
  "prepTime": numero_en_minutos,
  "cookTime": numero_en_minutos,
  "difficulty": "easy|medium|hard",
  "servings": ${servings},
  "gourmetTips": [
    {"title": "Título del tip", "description": "Explicación detallada", "technique": "Nombre técnico en francés o inglés"}
  ],
  "variations": [
    {"name": "Nombre de la variación", "description": "Cómo cambia", "extraIngredients": ["+ ingrediente extra 1", "+ ingrediente extra 2"], "twist": "Categoría (ej: Versión al horno)"}
  ],
  "winePairing": "Sugerencia específica de vino o bebida con justificación",
  "platingTip": "Consejo de emplatado para que se vea como en restaurante"
}`;
}

export function buildItineraryPrompt(req: ItineraryRequest): string {
  const {
    elements,
    country,
    budget = 'medio',
    duration = 2,
    travelerType = 'aventurero',
    companions = 2,
  } = req;

  return `Eres un viajero experto latinoamericano apasionado. Vas a crear un itinerario basado en los elementos/recursos que esta persona ya tiene para viajar: ${elements.join(', ')}.

Contexto:
- País/región de origen: ${country}
- Presupuesto: ${budget}
- Duración: ${duration} días
- Tipo de viajero: ${travelerType}
- Compañeros: ${companions}

REGLAS ESTRICTAS:
1. El itinerario debe ser realista, ejecutable y adaptado al presupuesto.
2. El tono debe ser cálido, en español neutro/latino. Usa "tienes", "puedes", "lleva".
3. Incluye tips de viajero experimentado (hacks de transporte, dónde comer local, cómo ahorrar).
4. Genera 3 VARIACIONES del mismo destino con enfoques diferentes (aventura, relax, cultural, gastronómico).
5. Incluye presupuesto estimado en moneda local.

DEVUELVE EXACTAMENTE este JSON, sin markdown, sin explicaciones previas, SOLO el JSON:

{
  "title": "Nombre creativo del itinerario (ej: 'Fin de semana en Valparaíso')",
  "description": "Descripción de 1-2 oraciones que vende la experiencia",
  "experience": "Frase corta evocativa (ej: 'Un abrazo del Pacífico en cada mirada')",
  "ingredients": ["Día 1: Actividad principal", "Día 1: Almuerzo", "Día 2: Actividad", ...],
  "steps": ["Día/Hora — Actividad detallada con instrucciones", "Día/Hora — Siguiente actividad", ...],
  "prepTime": 10,
  "cookTime": ${duration * 12},
  "difficulty": "Fácil|Medio|Difícil",
  "servings": ${companions},
  "gourmetTips": [
    {"title": "Título del hack de viajero", "description": "Explicación detallada", "technique": "Categoría (ej: Hack local, Seguridad, Fotografía)"}
  ],
  "variations": [
    {"name": "Nombre de la variación", "description": "Cómo cambia el viaje", "extraIngredients": ["+ elemento extra 1", "+ elemento extra 2"], "twist": "Categoría (ej: Naturaleza, Eno-turismo, Foodie)"}
  ],
  "winePairing": "Sugerencia gastronómica o bebida típica del destino con justificación",
  "platingTip": "Consejo de cómo documentar el viaje (mejor spot para foto, storytelling)"
}`;
}

export function parseAIResponse(text: string): unknown {
  // Limpiar markdown code blocks
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}
