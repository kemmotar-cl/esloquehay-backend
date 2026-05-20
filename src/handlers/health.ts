import { log } from '../middleware/logger';

export function handleHealth(meta: { clientIP: string; sessionId: string; path: string }) {
  log('info', 'health_check', meta);
  return {
    status: 'ok',
    model: '@cf/meta/llama-3.1-8b-instruct',
    source: 'cloudflare-workers-ai',
    keyConfigured: true,
  };
}
