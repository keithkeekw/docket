import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiGet } from './client';

const schema = z.object({ ok: z.boolean() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('returns the parsed payload when the shape matches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: true })),
    );

    await expect(apiGet('/api/example', schema)).resolves.toEqual({ ok: true });
  });

  it('throws ApiError with the status when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'Not found' }, 404)),
    );

    await expect(apiGet('/api/example', schema)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
  });

  it('throws ApiError when the payload does not match the schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: 'yes' })),
    );

    await expect(apiGet('/api/example', schema)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>', { status: 200 })),
    );

    await expect(apiGet('/api/example', schema)).rejects.toBeInstanceOf(ApiError);
  });

  it('reports an unreachable API distinctly from an HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(apiGet('/api/example', schema)).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });
  });
});
