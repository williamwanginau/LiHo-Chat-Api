import { defaultCorsOrigins, resolveCorsOrigins } from './cors';

describe('resolveCorsOrigins', () => {
  it('returns defaults when src is missing/blank', () => {
    const out1 = resolveCorsOrigins();
    const out2 = resolveCorsOrigins('   ');
    const defaults = defaultCorsOrigins();

    // Should match defaults (length + every item is RegExp)
    expect(out1).toHaveLength(defaults.length);
    expect(out2).toHaveLength(defaults.length);
    expect(out1.every((x) => x instanceof RegExp)).toBe(true);
    expect(out2.every((x) => x instanceof RegExp)).toBe(true);

    // Ensure it returns a copy, not the same array instance
    expect(out1).not.toBe(defaults);
  });

  it('parses comma list and trims spaces', () => {
    const out = resolveCorsOrigins('https://a.com,  https://b.com');
    expect(out).toEqual(['https://a.com', 'https://b.com']);
  });

  it('drops trailing slash for consistency', () => {
    const out = resolveCorsOrigins('https://a.com/, https://b.com/');
    expect(out).toEqual(['https://a.com', 'https://b.com']);
  });

  it('deduplicates duplicates while preserving order', () => {
    const out = resolveCorsOrigins('https://a.com, https://a.com, https://b.com');
    expect(out).toEqual(['https://a.com', 'https://b.com']);
  });

  it('falls back to defaults when list becomes empty after filtering', () => {
    const out = resolveCorsOrigins(' , , ');
    const defaults = defaultCorsOrigins();
    expect(out).toHaveLength(defaults.length);
    expect(out.every((x) => x instanceof RegExp)).toBe(true);
  });
});

