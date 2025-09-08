export type CursorTuple = {
  createdAt: Date;
  id: string;
};

/**
 * Encode a cursor as Base64 string using the tuple "ISO8601|id".
 * - createdAt is encoded as `toISOString()` to preserve ordering semantics.
 * - id is treated as an opaque stable tiebreaker (uuid/cuid/hex allowed).
 */
export function encodeCursor(cur: CursorTuple): string {
  const iso = cur.createdAt.toISOString();
  const id = String(cur.id);
  return Buffer.from(`${iso}|${id}`, 'utf8').toString('base64');
}

/**
 * Decode a Base64 cursor back into the tuple.
 * Strict validation:
 * - must be valid Base64 producing exactly two parts split by '|'
 * - first part must parse to a valid Date (ISO8601 recommended)
 * - id must be a conservative ASCII token: 10..64 of [A-Za-z0-9_-]
 *   (compatible with uuid/cuid/hex; keeps future ORM flexibility)
 */
export function decodeCursor(cursor: string): CursorTuple {
  if (typeof cursor !== 'string') throw new Error('Invalid cursor');
  const trimmed = cursor.trim();
  if (!trimmed) throw new Error('Invalid cursor');

  let decoded: string;
  try {
    decoded = Buffer.from(trimmed, 'base64').toString('utf8');
  } catch {
    throw new Error('Invalid cursor');
  }

  const parts = decoded.split('|');
  if (parts.length !== 2) throw new Error('Invalid cursor');

  const [iso, id] = parts;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) throw new Error('Invalid cursor');

  // Allow 2..64 length to accommodate various id schemes (uuid/cuid/short ids in tests)
  const idOk = /^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/.test(id);
  if (!idOk) throw new Error('Invalid cursor');

  return { createdAt: dt, id };
}
