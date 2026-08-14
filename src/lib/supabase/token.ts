import { devAccessToken, isSupabaseConfigured } from '@/lib/env';
import { NotAuthenticatedError } from '@/lib/api/errors';

/**
 * Supplies the bearer token for an API request.
 *
 * FRONTEND_TECHNICAL_DESIGN §5.2, the rule this module exists for: read the
 * access token immediately before each request, never once at module load.
 * Supabase rotates it silently, and a token captured at import time produces
 * mysterious 401s about an hour into a session.
 *
 * `getSession()` returns the cached session and refreshes it when it is close to
 * expiry, so calling this per request is cheap.
 */
export async function getAccessToken(): Promise<string> {
  // A dev token short-circuits Supabase entirely, for working against a local
  // backend running with SUPABASE_JWT_SECRET. `devAccessToken` is already
  // undefined outside development (see lib/env).
  if (devAccessToken) return devAccessToken;

  if (!isSupabaseConfigured) {
    throw new NotAuthenticatedError(
      'No credentials are configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY, or ' +
        'NEXT_PUBLIC_DEV_ACCESS_TOKEN for local development.',
    );
  }

  // Imported lazily so a dev-token setup never pays for the Supabase bundle.
  const { getBrowserClient } = await import('./browser');
  const {
    data: { session },
  } = await getBrowserClient().auth.getSession();

  if (!session?.access_token) throw new NotAuthenticatedError();
  return session.access_token;
}

/** True when a caller could get a token without a round-trip to sign-in. */
export async function hasSession(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
