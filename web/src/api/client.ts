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
 * One request helper for every call. Responses are parsed with the shared Zod
 * schema, so a drifting server shape fails loudly instead of rendering
 * `undefined` (TECHSTACK §5: the client never trusts the wire).
 */
async function request(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(`Could not reach the local API (${path})`);
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`.trim();

    try {
      const payload: unknown = await response.json();
      if (
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string'
      ) {
        message = payload.error;
      }
    } catch {
      // Keep the status-based message when the body is not JSON.
    }

    throw new ApiError(message, response.status);
  }

  return response;
}

async function parseJson<T>(response: Response, schema: ZodType<T>, path: string): Promise<T> {
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

export async function apiGet<T>(
  path: string,
  schema: ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  return parseJson(await request(path, { signal }), schema, path);
}

export async function apiMutate<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT',
  body: unknown,
  schema: ZodType<T>,
): Promise<T> {
  const response = await request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  return parseJson(response, schema, path);
}

export async function apiDelete(path: string): Promise<void> {
  await request(path, { method: 'DELETE' });
}
