import { z } from 'zod';

export const recipeRequestSchema = z.object({
  ingredients: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(20),
  country: z.string().min(1).max(50),
  flavorProfile: z.string().max(50).optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  servings: z.number().int().min(1).max(50).optional(),
  maxPrepTime: z.number().int().min(5).max(2880).optional(),
  additionalIngredient: z.string().max(100).optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  language: z.string().max(10).optional(),
  dietaryRestrictions: z.array(z.string().max(50)).max(10).optional(),
  experienceMode: z.boolean().optional(),
});

export const itineraryRequestSchema = z.object({
  elements: z.array(z.string().min(1).max(100)).min(1).max(20),
  country: z.string().min(1).max(50),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  duration: z.number().int().min(1).max(30).optional(),
  travelerType: z.string().max(50).optional(),
  companions: z.number().int().min(1).max(50).optional(),
  language: z.string().max(10).optional(),
});

export const recipeResultSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  experience: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  prepTime: z.number().int().min(0),
  cookTime: z.number().int().min(0),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  servings: z.number().int().min(1),
  gourmetTips: z.array(z.object({
    title: z.string(),
    description: z.string(),
    technique: z.string().optional(),
  })),
  variations: z.array(z.object({
    name: z.string(),
    description: z.string(),
    extraIngredients: z.array(z.string()),
    twist: z.string(),
  })),
  winePairing: z.string().optional(),
  platingTip: z.string().optional(),
});

export type ValidatedRecipeRequest = z.infer<typeof recipeRequestSchema>;
export type ValidatedItineraryRequest = z.infer<typeof itineraryRequestSchema>;
export type ValidatedRecipeResult = z.infer<typeof recipeResultSchema>;
