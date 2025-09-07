import { resolveCorsOrigins } from './cors';

describe('resolveCorsOrigins (production behavior)', () => {
  const prev = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });
  afterAll(() => {
    process.env.NODE_ENV = prev;
  });

  it('returns [] when src is missing/blank', () => {
    expect(resolveCorsOrigins()).toEqual([]);
    expect(resolveCorsOrigins('   ')).toEqual([]);
  });

  it('returns [] when list becomes empty after filtering', () => {
    expect(resolveCorsOrigins(' , , ')).toEqual([]);
  });
});

