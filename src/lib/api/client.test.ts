import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiBlob, idempotencyKey } from './client';
import { ApiError, NetworkError } from './errors';

vi.mock('@/lib/supabase/token', () => ({
  getAccessToken: vi.fn(async () => 'test-token'),
  hasSession: vi.fn(async () => true),
}));

const API_BASE = 'http://localhost:8000';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function errorResponse(code: string, status: number, extra: Record<string, unknown> = {}) {
  return jsonResponse(
    { error: { code, message: `${code} happened`, requestId: 'req-1', ...extra } },
    { status },
  );
}

/**
 * Await a rejection and get it back typed. `.catch(e => e)` yields `unknown`
 * under strict mode, which would mean a cast at every assertion below.
 */
async function rejection<T = ApiError>(promise: Promise<unknown>): Promise<T> {
  try {
    await promise;
    throw new Error('Expected the request to reject, but it resolved.');
  } catch (error) {
    return error as T;
  }
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // Backoff sleeps are real timers; collapse them so retry tests stay fast.
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void) => {
    fn();
    return 0;
  }) as unknown as typeof setTimeout);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requests', () => {
  it('prefixes the configured base and returns the parsed body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [1, 2] }));

    await expect(api('/v1/folders')).resolves.toEqual({ items: [1, 2] });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/v1/folders`, expect.anything());
  });

  it('attaches the bearer token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api('/v1/folders');

    const headers = fetchMock.mock.calls[0]![1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('omits the token for anonymous requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api('/p/abc/data', { anonymous: true });

    const headers = fetchMock.mock.calls[0]![1].headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('serialises a JSON body and sets the content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api('/v1/folders', { method: 'POST', body: { name: 'Japan' } });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe('{"name":"Japan"}');
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('lets the browser set the content type for FormData, so the boundary survives', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const form = new FormData();
    form.set('file', new Blob(['x']));

    await api('/v1/media', { method: 'POST', body: form });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe(form);
    expect((init.headers as Headers).get('Content-Type')).toBeNull();
  });

  it('returns undefined for 204 rather than trying to parse it', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api('/v1/folders/abc', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('drops empty and nullish search params instead of sending blanks', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api('/v1/trips', {
      searchParams: { view: 'dashboard', folderId: undefined, search: '', limit: 50 },
    });

    expect(fetchMock.mock.calls[0]![0]).toBe(`${API_BASE}/v1/trips?view=dashboard&limit=50`);
  });
});

describe('errors', () => {
  it('decodes the envelope into an ApiError', async () => {
    fetchMock.mockResolvedValue(errorResponse('NOT_FOUND', 404));

    const error = await rejection(api('/v1/trips/x'));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
    expect(error.requestId).toBe('req-1');
  });

  it('carries validation details through', async () => {
    fetchMock.mockResolvedValue(
      errorResponse('VALIDATION_FAILED', 422, {
        details: { issues: [{ path: 'body.title', message: 'Required' }] },
      }),
    );

    const error = await rejection(api('/v1/trips', { method: 'POST', body: {} }));
    expect(error.details).toEqual({ issues: [{ path: 'body.title', message: 'Required' }] });
  });

  it('still produces an ApiError when the response is not an envelope', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const error = await rejection(api('/v1/trips'));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('INTERNAL');
    expect(error.status).toBe(502);
  });

  it('raises NetworkError when the request never reaches the server', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await rejection<NetworkError>(api('/v1/trips', { retries: 0 }));
    expect(error).toBeInstanceOf(NetworkError);
  });

  it('propagates an abort rather than treating it as a failure to retry', async () => {
    fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    const error = await rejection<DOMException>(api('/v1/trips'));
    expect(error).toBeInstanceOf(DOMException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('retry policy', () => {
  it('retries 429 and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse('RATE_LIMITED', 429))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(api('/v1/trips')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries 503', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse('DEPENDENCY_UNAVAILABLE', 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(api('/v1/trips')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries 409 CONFLICT_STALE — that needs a human decision', async () => {
    // FR-COLLAB-07. Retrying here silently reintroduces the lost-update bug
    // that optimistic concurrency exists to prevent.
    fetchMock.mockResolvedValue(errorResponse('CONFLICT_STALE', 409));

    const error = await rejection(api('/v1/trips/x/blocks/y', { method: 'PATCH' }));
    expect(error.code).toBe('CONFLICT_STALE');
    expect(error.isConflict).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['400', 400, 'VALIDATION_FAILED'],
    ['401', 401, 'AUTH_REQUIRED'],
    ['403', 403, 'FORBIDDEN'],
    ['404', 404, 'NOT_FOUND'],
    ['422', 422, 'VALIDATION_FAILED'],
  ])('never retries %s', async (_label, status, code) => {
    fetchMock.mockResolvedValue(errorResponse(code, status));

    await api('/v1/trips').catch(() => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after the retry budget and throws the last error', async () => {
    // A fresh Response per call: a body can only be read once, and reusing one
    // object would make the second decode fail for reasons the client never
    // sees against a real server.
    fetchMock.mockImplementation(async () => errorResponse('RATE_LIMITED', 429));

    const error = await rejection(api('/v1/trips', { retries: 2 }));
    expect(error.code).toBe('RATE_LIMITED');
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('honours Retry-After', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'RATE_LIMITED', message: 'slow down' } },
          { status: 429, headers: { 'Retry-After': '2', 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(api('/v1/trips')).resolves.toEqual({ ok: true });
    expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
  });
});

describe('idempotency', () => {
  it('sends the key when given one', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api('/v1/trips', { method: 'POST', body: {}, idempotencyKey: 'key-1' });

    expect((fetchMock.mock.calls[0]![1].headers as Headers).get('Idempotency-Key')).toBe('key-1');
  });

  it('omits the header when none is given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api('/v1/trips');

    expect((fetchMock.mock.calls[0]![1].headers as Headers).get('Idempotency-Key')).toBeNull();
  });

  it('reuses the same key across retries — one intent, not one per attempt', async () => {
    // API_CONTRACT §3.5. A fresh key per attempt would turn a retried create
    // into two trips, which is exactly what idempotency is meant to prevent.
    fetchMock
      .mockResolvedValueOnce(errorResponse('RATE_LIMITED', 429))
      .mockResolvedValueOnce(jsonResponse({ id: 'trip-1' }));

    await api('/v1/trips', { method: 'POST', body: {}, idempotencyKey: 'key-1' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      expect((call[1].headers as Headers).get('Idempotency-Key')).toBe('key-1');
    }
  });

  it('generates distinct keys', () => {
    expect(idempotencyKey()).not.toBe(idempotencyKey());
    expect(idempotencyKey()).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('apiBlob', () => {
  it('returns a blob for the export routes', async () => {
    // A plain string body: jsdom's Blob is not the Blob undici's Response
    // understands, and it would be stringified to "[object Blob]" instead.
    fetchMock.mockResolvedValue(
      new Response('%PDF-1.4', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );

    const blob = await apiBlob('/v1/trips/x/export.pdf', {
      searchParams: { includeBookings: false },
    });

    // Not `toBeInstanceOf(Blob)`: under jsdom the global Blob and the one undici
    // hands back from Response are different classes, so identity fails even
    // though the value is a perfectly good blob.
    expect(blob.size).toBe(8);
    expect(blob.type).toBe('application/pdf');
    expect(typeof blob.arrayBuffer).toBe('function');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      `${API_BASE}/v1/trips/x/export.pdf?includeBookings=false`,
    );
  });

  it('decodes an error envelope rather than returning a blob of JSON', async () => {
    fetchMock.mockResolvedValue(errorResponse('FORBIDDEN', 403));

    const error = await rejection(apiBlob('/v1/trips/x/export.pdf'));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('FORBIDDEN');
  });
});
