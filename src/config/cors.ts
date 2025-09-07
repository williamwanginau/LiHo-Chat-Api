export type Origin = string | RegExp;

// Development-safe defaults; in production we require explicit allowlist.
const DEFAULTS_DEV: Origin[] = [/localhost:\d+$/, /127\.0\.0\.1:\d+$/];

export function defaultCorsOrigins(): Origin[] {
  return [...DEFAULTS_DEV];
}

/**
 * Parse comma-separated origins from env into a list of string origins.
 * - dev/test: when empty, fall back to localhost patterns.
 * - production: when empty, allow none (require explicit CORS_ORIGINS).
 */
export function resolveCorsOrigins(src?: string): Origin[] {
  const trimmed = (src ?? '').trim();
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  if (!trimmed) {
    return env === 'production' ? [] : defaultCorsOrigins();
  }

  const items = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\/+$/, ''));

  const seen = new Set<string>();
  const uniq = items.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));

  if (uniq.length) return uniq;
  return env === 'production' ? [] : defaultCorsOrigins();
}
