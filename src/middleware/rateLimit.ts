import type { KVNamespace } from '../types';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const KV_KEY_PREFIX = 'ratelimit:';
const KV_TTL_SECONDS = 60;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export async function checkRateLimit(
  ip: string,
  kv: KVNamespace
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `${KV_KEY_PREFIX}${ip}`;
  const now = Date.now();

  const raw = await kv.get(key);
  if (!raw) {
    const entry: RateLimitEntry = { count: 1, resetAt: now + RATE_WINDOW_MS };
    await kv.put(key, JSON.stringify(entry), { expirationTtl: KV_TTL_SECONDS });
    return { allowed: true };
  }

  const entry = JSON.parse(raw) as RateLimitEntry;

  if (now > entry.resetAt) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + RATE_WINDOW_MS };
    await kv.put(key, JSON.stringify(newEntry), { expirationTtl: KV_TTL_SECONDS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  await kv.put(key, JSON.stringify(entry), { expirationTtl: KV_TTL_SECONDS });
  return { allowed: true };
}
