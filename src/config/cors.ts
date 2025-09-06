export type Origin = string | RegExp;

const DEFAULTS: Origin[] = [
  /localhost:\d+$/,
  /\.vercel\.app$/,
  /\.onrender\.com$/,
];

export function defaultCorsOrigins(): Origin[] {
  // Return a copy to prevent accidental mutation by callers
  return [...DEFAULTS];
}

/**
 * Parse comma-separated origins from env into a list of string origins.
 * Falls back to default regex origins when empty/invalid.
 */
export function resolveCorsOrigins(src?: string): Origin[] {
  const trimmed = (src ?? '').trim();
  if (!trimmed) return defaultCorsOrigins();

  const items = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    // drop trailing slashes to reduce mismatches (e.g., https://a.com/ → https://a.com)
    .map((s) => s.replace(/\/+$/, ''));

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const uniq = items.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));

  return uniq.length ? uniq : defaultCorsOrigins();
}

