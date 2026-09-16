type PathSegment = string | number;

function parsePath(path: string): PathSegment[] {
  return path.split(".").map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

export function getPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of parsePath(path)) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<PathSegment, unknown>)[segment];
  }
  return current;
}

/** Immutably sets a nested value by dotted path (numeric segments index into arrays), returning a new root. */
export function setPath<T>(root: T, path: string, value: unknown): T {
  const segments = parsePath(path);

  function recurse(node: unknown, index: number): unknown {
    const segment = segments[index]!;
    const isLast = index === segments.length - 1;
    const container: Record<PathSegment, unknown> = (
      Array.isArray(node) ? [...node] : { ...(node as Record<PathSegment, unknown>) }
    ) as Record<PathSegment, unknown>;

    container[segment] = isLast ? value : recurse(container[segment], index + 1);
    return container;
  }

  return recurse(root, 0) as T;
}
