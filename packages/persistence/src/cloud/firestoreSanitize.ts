/**
 * Firestore's setDoc()/updateDoc() reject any field whose value is `undefined` — it must be
 * either omitted or `null`. Our domain objects have many optional fields (Character.imageUrl,
 * Transaction.trace, CharacterStat.max, ...) that can end up as an explicit `undefined` property
 * rather than a genuinely absent key. This recursively strips those before every cloud write so
 * a stray optional field never breaks sync for an entire account.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : stripUndefinedDeep(item))) as unknown as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      result[key] = stripUndefinedDeep(v);
    }
    return result as T;
  }

  return value;
}
