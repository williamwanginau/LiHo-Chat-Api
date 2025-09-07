export function validateEnv(config: Record<string, unknown>) {
  // Minimal validation without extra deps. Keep tests friendly.
  const env = { ...config } as Record<string, unknown>;

  const str = (k: string) => (typeof env[k] === 'string' ? (env[k] as string).trim() : undefined);
  const nodeEnv = str('NODE_ENV') || 'development';
  env.NODE_ENV = nodeEnv;

  const jwt = str('JWT_SECRET');
  if (!jwt || jwt.length < 10) {
    throw new Error('Invalid or missing JWT_SECRET (min length 10)');
  }

  // DATABASE_URL is optional in test env to allow prisma to be mocked
  const db = str('DATABASE_URL');
  if (nodeEnv !== 'test' && !db) {
    // best-effort check, no uri parse to avoid deps
    throw new Error('Missing DATABASE_URL');
  }

  return env;
}

