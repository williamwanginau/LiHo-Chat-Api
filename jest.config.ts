import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Only include existing roots to avoid validation errors in CI.
  roots: ['<rootDir>/src'],
  testMatch: [
    "**/?(*.)+(spec|test).ts",
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  // Ignore framework glue files that don't carry business logic to make coverage more meaningful
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/app.module.ts',
    '<rootDir>/src/.+\\.module\\.ts$',
    '<rootDir>/src/auth/optional-jwt\\.guard\\.ts$',
    '<rootDir>/src/.+/dto/.+\\.ts$',
    '<rootDir>/src/.+\\.exception-filter\\.ts$',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

export default config;
