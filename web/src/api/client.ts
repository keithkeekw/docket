import type { ZodType } from 'zod';

/** Failure from the local API, with the HTTP status when there was a response. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Typed GET against the local API. Responses are parsed with the shared Zod
 * schema, so a drifting server shape fails loudly instead of rendering
 * `undefined` (TECHSTACK §5: the client never trusts the wire).
 */
export async function apiGet<T>(
  path: string,
  schema: ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(`Could not reach the local API (${path})`);
  }

  if (!response.ok) {
    throw new ApiError(
      `Request failed: ${response.status} ${response.statusText}`.trim(),
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(`Expected JSON from ${path}`, response.status);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(`Unexpected response shape from ${path}`, response.status);
  }

  return parsed.data;
}
