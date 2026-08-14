import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseConfig } from '@/lib/env';

/**
 * Supabase client for server components and route handlers.
 *
 * Only two surfaces need this — the public share page and the auth callback
 * (§3). Everything inside the app shell is a client component talking to the
 * API directly, because proxying through Next would spend the whole 100ms
 * interaction budget on an extra hop to Frankfurt.
 */
export async function createClient(): Promise<SupabaseClient> {
  const { url, anonKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. That is fine: middleware
          // refreshes the session on every request, so the write here is only
          // ever a redundant second chance.
        }
      },
    },
  });
}
