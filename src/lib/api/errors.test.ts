import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  ApiError,
  NetworkError,
  NotAuthenticatedError,
  fieldErrors,
  isApiErrorBody,
  userMessage,
} from './errors';

describe('isApiErrorBody', () => {
  it('recognises the envelope', () => {
    expect(isApiErrorBody({ error: { code: 'NOT_FOUND', message: 'gone' } })).toBe(true);
  });

  it('rejects anything else', () => {
    for (const value of [null, undefined, {}, { error: null }, { error: {} }, 'nope', []]) {
      expect(isApiErrorBody(value)).toBe(false);
    }
  });
});

describe('ApiError classification', () => {
  it('flags CONFLICT_STALE as the one conflict needing a human', () => {
    expect(new ApiError('CONFLICT_STALE', 409, '').isConflict).toBe(true);
    expect(new ApiError('CONFLICT_DUPLICATE', 409, '').isConflict).toBe(false);
  });

  it('flags both auth codes', () => {
    expect(new ApiError('AUTH_REQUIRED', 401, '').isAuth).toBe(true);
    expect(new ApiError('AUTH_INVALID_TOKEN', 401, '').isAuth).toBe(true);
    expect(new ApiError('FORBIDDEN', 403, '').isAuth).toBe(false);
  });

  it('treats only 429 and 503 as retryable', () => {
    expect(new ApiError('RATE_LIMITED', 429, '').isRetryable).toBe(true);
    expect(new ApiError('DEPENDENCY_UNAVAILABLE', 503, '').isRetryable).toBe(true);
    for (const status of [400, 401, 403, 404, 409, 422, 500, 502]) {
      expect(new ApiError('INTERNAL', status, '').isRetryable).toBe(false);
    }
  });
});

describe('userMessage', () => {
  it('prefers the server message, which is written in the product voice', () => {
    const error = new ApiError('NOT_FOUND', 404, 'Trip was not found');
    expect(userMessage(error)).toBe('Trip was not found');
  });

  it('falls back when the server message is the generic production 5xx string', () => {
    const error = new ApiError('INTERNAL', 500, 'Internal Server Error');
    expect(userMessage(error)).toBe('Something went wrong on our end.');
  });

  it('falls back when there is no message at all', () => {
    expect(userMessage(new ApiError('FORBIDDEN', 403, ''))).toBe(
      "You don't have permission to do that.",
    );
  });

  it('has copy for every code in the taxonomy', () => {
    for (const code of API_ERROR_CODES) {
      const message = userMessage(new ApiError(code, 400, ''));
      expect(message, code).not.toBe('Something went wrong.');
      expect(message.length, code).toBeGreaterThan(0);
    }
  });

  it('explains an unreachable server without alarming the user about their edit', () => {
    expect(userMessage(new NetworkError('offline'))).toContain('keep your changes');
  });

  it('passes through the auth message', () => {
    expect(userMessage(new NotAuthenticatedError())).toBe('You are signed out.');
  });

  it('degrades gracefully for a thrown non-error', () => {
    expect(userMessage('a string')).toBe('Something went wrong.');
    expect(userMessage(undefined)).toBe('Something went wrong.');
  });

  it('handles an unknown code from a newer server', () => {
    expect(userMessage(new ApiError('SOMETHING_NEW', 400, 'Specific detail'))).toBe(
      'Specific detail',
    );
  });
});

describe('fieldErrors', () => {
  // The shape below is the live one, captured from the deployed API.
  const validationError = new ApiError(
    'VALIDATION_FAILED',
    422,
    'Request validation failed',
    'r1',
    {
      issues: [
        { path: 'body.destination', message: 'Required' },
        { path: 'body.title', message: 'String must contain at least 1 character(s)' },
      ],
    },
  );

  it('keys by field name with the request-part prefix stripped', () => {
    expect(fieldErrors(validationError)).toEqual({
      destination: 'Required',
      title: 'String must contain at least 1 character(s)',
    });
  });

  it('strips every request-part prefix', () => {
    const error = new ApiError('VALIDATION_FAILED', 422, '', undefined, {
      issues: [
        { path: 'query.limit', message: 'Too large' },
        { path: 'params.tripId', message: 'Invalid uuid' },
      ],
    });
    expect(fieldErrors(error)).toEqual({ limit: 'Too large', tripId: 'Invalid uuid' });
  });

  it('keeps the first message when a field has several issues', () => {
    const error = new ApiError('VALIDATION_FAILED', 422, '', undefined, {
      issues: [
        { path: 'body.title', message: 'Required' },
        { path: 'body.title', message: 'Too short' },
      ],
    });
    expect(fieldErrors(error)).toEqual({ title: 'Required' });
  });

  it('accepts an array path as well as a dotted string', () => {
    const error = new ApiError('VALIDATION_FAILED', 422, '', undefined, {
      issues: [{ path: ['body', 'cost', 'amountMinor'], message: 'Required' }],
    });
    expect(fieldErrors(error)).toEqual({ 'cost.amountMinor': 'Required' });
  });

  it('returns nothing for other error codes', () => {
    expect(fieldErrors(new ApiError('NOT_FOUND', 404, 'gone'))).toEqual({});
    expect(fieldErrors(new NetworkError('offline'))).toEqual({});
  });

  it('survives a details payload in an unexpected shape', () => {
    for (const details of [undefined, null, 'nope', [], { issues: 'nope' }, { other: 1 }]) {
      const error = new ApiError('VALIDATION_FAILED', 422, '', undefined, details);
      expect(fieldErrors(error)).toEqual({});
    }
  });
});
