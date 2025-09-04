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
  coverageDirectory: 'coverage',
};

export default config;
