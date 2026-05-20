const INJECTION_PATTERNS = [
  /ignore\s+previous/i,
  /forget\s+(everything|all|previous)/i,
  /system\s+prompt/i,
  /instruction\s*:/i,
  /you\s+are\s+now/i,
  /new\s+role\s*:/i,
  /disregard\s+(all|previous)/i,
];

export function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

export function sanitizeIngredients(ingredients: string[]): string[] {
  return ingredients.map((ing) => {
    const trimmed = ing.trim().slice(0, 100);
    if (containsInjection(trimmed)) {
      throw new Error('Invalid input detected');
    }
    return trimmed;
  });
}
