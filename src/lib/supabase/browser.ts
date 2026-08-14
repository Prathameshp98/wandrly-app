import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseConfig } from '@/lib/env';

/**
 * The browser-side Supabase client, as a singleton.
 *
 * `@supabase/ssr` stores the session in cookies so it is readable from both
 * server and client components, and the middleware refreshes it. Creating more
 * than one client per document gives you two auth listeners fighting over the
 * same cookie, so this is deliberately memoised.
 */
let client: SupabaseClient | undefined;

export function getBrowserClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = requireSupabaseConfig();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}

/** Test seam — drops the memoised client so a suite can swap config. */
export function resetBrowserClient(): void {
  client = undefined;
}
