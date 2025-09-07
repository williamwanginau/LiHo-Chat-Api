import { validateEnv } from './validate';

describe('validateEnv', () => {
  it('throws when JWT_SECRET missing or too short', () => {
    expect(() => validateEnv({})).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('allows missing DATABASE_URL in test env', () => {
    const env = validateEnv({ NODE_ENV: 'test', JWT_SECRET: 'x'.repeat(12) });
    expect(env.NODE_ENV).toBe('test');
  });

  it('throws when DATABASE_URL missing in production', () => {
    expect(() => validateEnv({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(12) })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('defaults NODE_ENV to development when not provided', () => {
    const env = validateEnv({ JWT_SECRET: 'x'.repeat(12), DATABASE_URL: 'postgres://x' });
    expect(env.NODE_ENV).toBe('development');
  });
});

