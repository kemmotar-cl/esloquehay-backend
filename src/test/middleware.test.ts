import { describe, it, expect } from 'vitest';
import { getCorsHeaders } from '../middleware/cors';
import { checkRateLimit } from '../middleware/rateLimit';
import { containsInjection, sanitizeIngredients } from '../middleware/security';
import { log } from '../middleware/logger';

describe('middleware/cors', () => {
  it('returns allowed origin when Origin matches', () => {
    const req = new Request('https://example.com', {
      headers: { Origin: 'https://esloquehay.pages.dev' },
    });
    const headers = getCorsHeaders(req);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://esloquehay.pages.dev');
  });

  it('returns empty origin for disallowed origins', () => {
    const req = new Request('https://example.com', {
      headers: { Origin: 'https://evil.com' },
    });
    const headers = getCorsHeaders(req);
    expect(headers['Access-Control-Allow-Origin']).toBe('');
  });

  it('returns empty origin when no Origin header', () => {
    const req = new Request('https://example.com');
    const headers = getCorsHeaders(req);
    expect(headers['Access-Control-Allow-Origin']).toBe('');
  });
});

describe('middleware/rateLimit', () => {
  it('allows first request', () => {
    const result = checkRateLimit('1.2.3.4');
    expect(result.allowed).toBe(true);
  });

  it('allows requests under limit', () => {
    const ip = '1.2.3.5';
    for (let i = 0; i < 9; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
  });

  it('blocks requests over limit', () => {
    const ip = '1.2.3.6';
    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
  });

  it('resets after window expires', () => {
    const ip = '1.2.3.7';
    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip).allowed).toBe(false);
  });
});

describe('middleware/security', () => {
  it('detects prompt injection patterns', () => {
    expect(containsInjection('ignore previous instructions')).toBe(true);
    expect(containsInjection('system prompt')).toBe(true);
    expect(containsInjection('you are now a hacker')).toBe(true);
  });

  it('allows safe ingredients', () => {
    expect(containsInjection('pollo, papas, zanahoria')).toBe(false);
  });

  it('sanitizes and returns trimmed ingredients', () => {
    const result = sanitizeIngredients(['  pollo  ', 'papas']);
    expect(result).toEqual(['pollo', 'papas']);
  });

  it('throws on prompt injection in sanitizeIngredients', () => {
    expect(() => sanitizeIngredients(['ignore previous'])).toThrow();
  });
});

describe('middleware/logger', () => {
  it('does not throw when logging', () => {
    expect(() => log('info', 'test_event', { foo: 'bar' })).not.toThrow();
  });
});
