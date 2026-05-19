export interface GourmetTip {
  title: string;
  description: string;
  technique?: string;
}

export interface Variation {
  name: string;
  description: string;
  extraIngredients: string[];
  twist: string;
}

export interface RecipeResult {
  id: string;
  title: string;
  description: string;
  experience: string;
  ingredients: string[];
  steps: string[];
  prepTime: number;
  cookTime: number;
  difficulty: 'Fácil' | 'Medio' | 'Difícil';
  servings: number;
  gourmetTips: GourmetTip[];
  variations: Variation[];
  winePairing?: string;
  platingTip?: string;
}

export interface RecipeRequest {
  ingredients: string[];
  country: string;
  flavorProfile?: string;
  skillLevel?: string;
  servings?: number;
  maxPrepTime?: number;
  additionalIngredient?: string;
  budget?: string;
  language?: string;
}

export interface ItineraryRequest {
  elements: string[];
  country: string;
  budget?: string;
  duration?: number;
  travelerType?: string;
  companions?: number;
}
