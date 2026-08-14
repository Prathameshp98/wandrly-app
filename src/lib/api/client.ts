import { API_BASE } from '@/lib/env';
import { ApiError, NetworkError, isApiErrorBody } from './errors';
import { getAccessToken } from '@/lib/supabase/token';

/**
 * The one module every request goes through, so auth, error decoding,
 * idempotency and retry policy are each handled exactly once
 * (FRONTEND_TECHNICAL_DESIGN §6.2).
 *
 * Three rules it exists to enforce:
 *
 *   - Never swallow an ApiError. FR-NFR-REL-03 forbids silent loss; every
 *     mutation failure has to reach the user as something retryable.
 *   - Never auto-retry 409 CONFLICT_STALE. That is a real conflict needing a
 *     human decision (FR-COLLAB-07), and retrying reintroduces the lost update.
 *   - Never retry any other 4xx. Only 429 and 503 get another attempt.
 */

export interface ApiInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * Generate once per user intent, NOT per network attempt (API_CONTRACT §3.5).
   * Retries inside this module deliberately reuse the same key — that is the
   * entire point of it.
   */
  idempotencyKey?: string;
  /** Skip the Authorization header. For public endpoints like /p/{slug}. */
  anonymous?: boolean;
  /** Overrides the default retry budget. 0 disables retrying entirely. */
  retries?: number;
  searchParams?: Record<string, string | number | boolean | undefined | null>;
}

const DEFAULT_RETRIES = 2;
const BASE_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 8_000;

export function idempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

function buildUrl(path: string, searchParams: ApiInit['searchParams']): string {
  const url = `${API_BASE}${path}`;
  if (!searchParams) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${url}?${query}` : url;
}

/**
 * Honour `Retry-After` when the server sends one, since it knows better than a
 * fixed curve; otherwise exponential backoff with jitter so a fleet of clients
 * does not retry in lockstep.
 */
function backoffMs(attempt: number, response?: Response): number {
  const header = response?.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, MAX_BACKOFF_MS);
  }
  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  return exponential * (0.5 + Math.random() / 2);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function decodeError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (isApiErrorBody(body)) {
    const { code, message, details, requestId } = body.error;
    return new ApiError(code, response.status, message, requestId, details);
  }

  // A non-envelope failure is infrastructure rather than the API — a proxy, a
  // gateway timeout, a cold start. Map it to the closest code so callers still
  // get consistent handling.
  const code = response.status >= 500 ? 'INTERNAL' : 'DOMAIN_RULE_VIOLATION';
  return new ApiError(code, response.status, response.statusText || 'Request failed');
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const {
    body,
    idempotencyKey: key,
    anonymous = false,
    retries = DEFAULT_RETRIES,
    searchParams,
    headers: extraHeaders,
    ...rest
  } = init;

  const url = buildUrl(path, searchParams);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let lastError: ApiError | NetworkError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const headers = new Headers(extraHeaders);

    // Content-Type is set by the browser for FormData, boundary included.
    if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');
    if (key) headers.set('Idempotency-Key', key);

    if (!anonymous) {
      // Read the token immediately before each request, never once at module
      // load: Supabase rotates it silently, and a captured token produces
      // mysterious 401s an hour into a session (§5.2).
      headers.set('Authorization', `Bearer ${await getAccessToken()}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...rest,
        headers,
        body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      });
    } catch (cause) {
      // An aborted request is the caller's intent, not a failure to retry.
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;

      lastError = new NetworkError(`Could not reach the server (${path})`, cause);
      if (attempt < retries) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }

    const error = await decodeError(response);

    if (error.isRetryable && attempt < retries) {
      lastError = error;
      await sleep(backoffMs(attempt, response));
      continue;
    }

    throw error;
  }

  // Only reachable if the loop exhausts its budget on a retryable failure.
  throw lastError ?? new NetworkError(`Request failed (${path})`);
}

/**
 * For endpoints that return something other than JSON — the three export
 * routes, which stream a PDF, an .ics or plain text.
 */
export async function apiBlob(path: string, init: ApiInit = {}): Promise<Blob> {
  const {
    searchParams,
    anonymous = false,
    headers: extraHeaders,
    // Destructured away rather than forwarded: these are this module's own
    // options, not fetch's, and `body: unknown` does not satisfy BodyInit.
    body: _body,
    idempotencyKey: _key,
    retries: _retries,
    ...rest
  } = init;

  const headers = new Headers(extraHeaders);
  if (!anonymous) headers.set('Authorization', `Bearer ${await getAccessToken()}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), { ...rest, headers });
  } catch (cause) {
    throw new NetworkError(`Could not reach the server (${path})`, cause);
  }

  if (!response.ok) throw await decodeError(response);
  return response.blob();
}
