/**
 * The API's error taxonomy, and the one place a code becomes user-facing copy.
 *
 * The envelope is always `{ error: { code, message, details?, requestId? } }`
 * (API_CONTRACT §3.4). `message` is written in the product's voice and is
 * generally safe to show directly — except in production, where 5xx replaces it
 * with a generic string, which is why the fallbacks below exist.
 */

/** The 19 stable codes from API_CONTRACT §3.4. */
export const API_ERROR_CODES = [
  'AUTH_REQUIRED',
  'AUTH_INVALID_TOKEN',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'CONFLICT_DUPLICATE',
  'CONFLICT_STALE',
  'CONFLICT_DATE_CHANGE',
  'CONFLICT_IDEMPOTENCY_MISMATCH',
  'DOMAIN_RULE_VIOLATION',
  'LIMIT_EXCEEDED',
  'RATE_LIMITED',
  'LEDGER_SHARES_MISMATCH',
  'LEDGER_PAYMENTS_MISMATCH',
  'LEDGER_IMBALANCE',
  'LEDGER_PARTICIPANT_HAS_HISTORY',
  'LEDGER_UNSETTLED_BALANCES',
  'DEPENDENCY_UNAVAILABLE',
  'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** An unrecognised code is still an error; it just gets generic handling. */
export type AnyErrorCode = ApiErrorCode | (string & {});

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as { error?: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly code: AnyErrorCode,
    readonly status: number,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }

  /**
   * A conflict is never retried automatically. FR-COLLAB-07 requires showing
   * both values and letting a human choose; retrying reintroduces exactly the
   * lost-update bug optimistic concurrency exists to prevent.
   */
  get isConflict(): boolean {
    return this.code === 'CONFLICT_STALE';
  }

  get isAuth(): boolean {
    return this.code === 'AUTH_REQUIRED' || this.code === 'AUTH_INVALID_TOKEN';
  }

  /** Only 429 and 503 are worth another attempt. Nothing else is. */
  get isRetryable(): boolean {
    return this.status === 429 || this.status === 503;
  }
}

/** Raised when the client cannot obtain an access token at all. */
export class NotAuthenticatedError extends Error {
  override readonly name = 'NotAuthenticatedError';
  constructor(message = 'You are signed out.') {
    super(message);
  }
}

/** Raised when the request never reached the server — offline, DNS, CORS. */
export class NetworkError extends Error {
  override readonly name = 'NetworkError';
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

/**
 * Fallback copy, used only when the server's own message is missing or has been
 * replaced by the generic production string. The server's message wins whenever
 * it says something specific.
 */
const FALLBACK_MESSAGES: Record<ApiErrorCode, string> = {
  AUTH_REQUIRED: 'Sign in to continue.',
  AUTH_INVALID_TOKEN: 'Your session expired. Sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that.",
  VALIDATION_FAILED: 'Some details need fixing.',
  CONFLICT_DUPLICATE: 'That already exists.',
  CONFLICT_STALE: 'Someone else edited this while you were working.',
  CONFLICT_DATE_CHANGE: 'Changing these dates affects existing days.',
  CONFLICT_IDEMPOTENCY_MISMATCH: 'That request was already sent with different details.',
  DOMAIN_RULE_VIOLATION: "That isn't allowed here.",
  LIMIT_EXCEEDED: "You've reached the limit for this trip.",
  RATE_LIMITED: 'Too many requests. Give it a moment.',
  LEDGER_SHARES_MISMATCH: "The shares don't add up to the total.",
  LEDGER_PAYMENTS_MISMATCH: "The payments don't add up to the total.",
  LEDGER_IMBALANCE: "The ledger doesn't balance.",
  LEDGER_PARTICIPANT_HAS_HISTORY: 'This person has expenses, so they cannot be removed.',
  LEDGER_UNSETTLED_BALANCES: 'There are still balances to settle.',
  DEPENDENCY_UNAVAILABLE: "Something we rely on isn't responding. Try again shortly.",
  INTERNAL: 'Something went wrong on our end.',
};

/** The generic string the API substitutes for 5xx messages in production. */
const GENERIC_SERVER_MESSAGE = /^(internal server error|something went wrong)\.?$/i;

export function userMessage(error: unknown): string {
  if (error instanceof NotAuthenticatedError) return error.message;
  if (error instanceof NetworkError) return "You appear to be offline. We'll keep your changes.";

  if (error instanceof ApiError) {
    const fallback = FALLBACK_MESSAGES[error.code as ApiErrorCode];
    if (!error.message || (fallback && GENERIC_SERVER_MESSAGE.test(error.message))) {
      return fallback ?? 'Something went wrong.';
    }
    return error.message;
  }

  return 'Something went wrong.';
}

/**
 * Field-level messages from a `VALIDATION_FAILED` response, keyed by field name,
 * so a form can attach each to the right input instead of dumping them all in a
 * toast.
 *
 * The live shape is `details: { issues: [{ path, message }] }`, where `path` is
 * dot-joined and prefixed by the request part it came from — `body.title`,
 * `query.limit`, `params.tripId`. The prefix is stripped so the key matches the
 * form field name; `body` is by far the common case and the others would never
 * correspond to an input anyway.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED') return {};

  const issues = (error.details as { issues?: unknown } | undefined)?.issues;
  if (!Array.isArray(issues)) return {};

  const fields: Record<string, string> = {};
  for (const issue of issues) {
    if (typeof issue !== 'object' || issue === null) continue;
    const { path, message } = issue as { path?: unknown; message?: unknown };
    if (typeof message !== 'string') continue;

    const raw = Array.isArray(path) ? path.join('.') : typeof path === 'string' ? path : null;
    if (!raw) continue;

    const key = raw.replace(/^(body|query|params|headers)\./, '');
    // First message wins: Zod can report several issues per field and the first
    // is the one describing what the user actually did.
    fields[key] ??= message;
  }
  return fields;
}
