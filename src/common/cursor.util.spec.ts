import { decodeCursor, encodeCursor } from './cursor.util';

describe('cursor.util', () => {
  const now = new Date('2025-09-06T12:00:00.000Z');

  it('round-trips encode/decode', () => {
    const c = { createdAt: now, id: 'cuid_abc123XYZ' };
    const s = encodeCursor(c);
    const d = decodeCursor(s);
    expect(d.createdAt.toISOString()).toBe(now.toISOString());
    expect(d.id).toBe('cuid_abc123XYZ');
  });

  it('rejects malformed base64', () => {
    expect(() => decodeCursor('???')).toThrow(/Invalid cursor/);
  });

  it('rejects wrong part count', () => {
    const bad = Buffer.from('only-one-part', 'utf8').toString('base64');
    expect(() => decodeCursor(bad)).toThrow(/Invalid cursor/);
  });

  it('rejects invalid date', () => {
    const s = Buffer.from('not-a-date|cuid_abc123XYZ', 'utf8').toString('base64');
    expect(() => decodeCursor(s)).toThrow(/Invalid cursor/);
  });

  it('rejects invalid id charset/length', () => {
    const badId = 'abc';
    const s = Buffer.from(`${now.toISOString()}|${badId}`, 'utf8').toString('base64');
    expect(() => decodeCursor(s)).toThrow(/Invalid cursor/);
  });
});

