import { describe, it, expect } from 'vitest';
import { buildRecipePrompt, buildItineraryPrompt, parseAIResponse } from '../prompts';
import type { RecipeRequest, ItineraryRequest } from '../types';

describe('buildRecipePrompt', () => {
  it('includes all ingredients in the prompt', () => {
    const req: RecipeRequest = {
      ingredients: ['pollo', 'arroz', 'limón'],
      country: 'Chile',
    };
    const prompt = buildRecipePrompt(req);
    expect(prompt).toContain('pollo');
    expect(prompt).toContain('arroz');
    expect(prompt).toContain('limón');
    expect(prompt).toContain('Chile');
  });

  it('includes additional ingredient when provided', () => {
    const req: RecipeRequest = {
      ingredients: ['pollo'],
      country: 'Chile',
      additionalIngredient: 'curry',
    };
    const prompt = buildRecipePrompt(req);
    expect(prompt).toContain('pollo');
    expect(prompt).toContain('curry');
  });

  it('uses default values when optional fields are missing', () => {
    const req: RecipeRequest = {
      ingredients: ['pollo'],
      country: 'Chile',
    };
    const prompt = buildRecipePrompt(req);
    expect(prompt).toContain('tradicional');
    expect(prompt).toContain('intermedio');
    expect(prompt).toContain('45 minutos');
  });

  it('forces JSON output instruction', () => {
    const req: RecipeRequest = {
      ingredients: ['pollo'],
      country: 'Chile',
    };
    const prompt = buildRecipePrompt(req);
    expect(prompt).toContain('DEVUELVE EXACTAMENTE este JSON');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"steps"');
  });
});

describe('buildItineraryPrompt', () => {
  it('includes all elements in the prompt', () => {
    const req: ItineraryRequest = {
      elements: ['mochila', 'cámara', 'pasaporte'],
      country: 'Chile',
    };
    const prompt = buildItineraryPrompt(req);
    expect(prompt).toContain('mochila');
    expect(prompt).toContain('cámara');
    expect(prompt).toContain('pasaporte');
    expect(prompt).toContain('Chile');
  });

  it('uses default values when optional fields are missing', () => {
    const req: ItineraryRequest = {
      elements: ['mochila'],
      country: 'Chile',
    };
    const prompt = buildItineraryPrompt(req);
    expect(prompt).toContain('medio');
    expect(prompt).toContain('2 días');
    expect(prompt).toContain('aventurero');
  });

  it('calculates cookTime based on duration', () => {
    const req: ItineraryRequest = {
      elements: ['mochila'],
      country: 'Chile',
      duration: 5,
    };
    const prompt = buildItineraryPrompt(req);
    expect(prompt).toContain('60');
  });
});

describe('parseAIResponse', () => {
  it('parses clean JSON', () => {
    const json = '{"title":"Test","servings":2}';
    const result = parseAIResponse(json);
    expect(result).toEqual({ title: 'Test', servings: 2 });
  });

  it('strips markdown json fences', () => {
    const markdown = '```json\n{"title":"Test"}\n```';
    const result = parseAIResponse(markdown);
    expect(result).toEqual({ title: 'Test' });
  });

  it('strips generic markdown fences', () => {
    const markdown = '```\n{"title":"Test"}\n```';
    const result = parseAIResponse(markdown);
    expect(result).toEqual({ title: 'Test' });
  });

  it('trims whitespace before parsing', () => {
    const messy = '   \n  ```json\n  {"title":"Test"}  \n  ```  \n  ';
    const result = parseAIResponse(messy);
    expect(result).toEqual({ title: 'Test' });
  });
});
