import type { RecipeRequest, ItineraryRequest } from './types';

export function buildRecipePrompt(req: RecipeRequest): string {
  const {
    ingredients,
    country,
    flavorProfile = 'tradicional',
    skillLevel = 'intermedio',
    servings = 2,
    maxPrepTime = 45,
    additionalIngredient = '',
  } = req;

  const allIngredients = additionalIngredient
    ? [...ingredients, additionalIngredient]
    : ingredients;

  return `Eres un chef gourmet latinoamericano creativo y práctico. Vas a crear una receta ÚNICA usando EXCLUSIVAMENTE estos ingredientes que la persona ya tiene: ${allIngredients.join(', ')}.

Contexto:
- País/región: ${country}
- Perfil de sabor: ${flavorProfile}
- Nivel de cocina: ${skillLevel}
- Comensales: ${servings}
- Tiempo máximo total: ${maxPrepTime} minutos

REGLAS ESTRICTAS:
1. USA ÚNICAMENTE los ingredientes listados (puedes usar agua, sal, pimienta, aceite básico sin contarlos).
2. La receta debe ser realista y ejecutable.
3. El tono debe ser cálido, en español neutro/latino (NO argentino). Usa "tenés", "podés", "serví".
4. Incluye tips gourmet que ELEVARÍAN el plato a nivel restaurante (técnicas, sustituciones, presentación).
5. Genera 3 VARIACIONES completamente diferentes usando los MISMOS ingredientes base.

DEVUELVE EXACTAMENTE este JSON, sin markdown, sin explicaciones previas, SOLO el JSON:

{
  "title": "Nombre creativo y tentador de la receta",
  "description": "Descripción de 1-2 oraciones que vende la experiencia",
  "experience": "Frase corta evocativa del tipo de experiencia (ej: 'Comfort food que abraza el alma')",
  "ingredients": ["cantidad + ingrediente 1", "cantidad + ingrediente 2", ...],
  "steps": ["Paso 1 detallado", "Paso 2 detallado", ...],
  "prepTime": numero_en_minutos,
  "cookTime": numero_en_minutos,
  "difficulty": "Fácil|Medio|Difícil",
  "servings": ${servings},
  "gourmetTips": [
    {"title": "Título del tip", "description": "Explicación detallada", "technique": "Nombre técnico en francés o inglés"}
  ],
  "variations": [
    {"name": "Nombre de la variación", "description": "Cómo cambia", "extraIngredients": ["+ ingrediente extra 1", "+ ingrediente extra 2"], "twist": "Categoría (ej: Fusión asiática)"}
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

  return `Eres un viajero experto latinoamericano apasionado. Vas a crear un itinerario ÚNICO basado en los elementos/recursos que esta persona ya tiene para viajar: ${elements.join(', ')}.

Contexto:
- País/región de origen: ${country}
- Presupuesto: ${budget}
- Duración: ${duration} días
- Tipo de viajero: ${travelerType}
- Compañeros: ${companions}

REGLAS ESTRICTAS:
1. El itinerario debe ser realista, ejecutable y adaptado al presupuesto.
2. El tono debe ser cálido, en español neutro/latino. Usa "tenés", "podés", "llevá".
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
