import { z } from 'zod';

/**
 * Next.js inlines `process.env.NEXT_PUBLIC_*` only where it appears as a static
 * member expression, so every variable is spelled out literally below. Reading
 * them through a computed key would silently yield `undefined` in the browser.
 */
const rawEnv = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_WS_BASE_URL: process.env.NEXT_PUBLIC_WS_BASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEV_ACCESS_TOKEN: process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN,
} as const;

/** Trailing slashes turn `${base}${path}` into a double slash and a 404. */
const baseUrl = z
  .string()
  .url()
  .transform((value) => value.replace(/\/+$/, ''));

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: baseUrl,
  NEXT_PUBLIC_WS_BASE_URL: baseUrl,
  // Optional here, required at the point a Supabase client is constructed. The
  // dev-token path talks to a local backend without Supabase in the picture at
  // all, and failing at boot would block that workflow for no reason.
  NEXT_PUBLIC_SUPABASE_URL: baseUrl.optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_DEV_ACCESS_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Environment is not configured.\n\n${missing}\n\n` +
        'Copy .env.example to .env.local and fill in the blanks.',
    );
  }

  return parsed.data;
}

export const env = parseEnv();

/**
 * A dev token short-circuits Supabase auth against a local backend running with
 * SUPABASE_JWT_SECRET (see wandrly-backend `npm run token:dev`). It is refused
 * outside development so a stray value in a built artefact cannot authenticate.
 */
export const devAccessToken: string | undefined =
  process.env.NODE_ENV === 'development' ? env.NEXT_PUBLIC_DEV_ACCESS_TOKEN : undefined;

export const API_BASE = env.NEXT_PUBLIC_API_BASE_URL;
export const WS_BASE = env.NEXT_PUBLIC_WS_BASE_URL;

/**
 * Supabase config, demanded at the moment it is actually needed so the failure
 * names the missing variable instead of surfacing as an opaque client error.
 */
export function requireSupabaseConfig(): { url: string; anonKey: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, or set ' +
        'NEXT_PUBLIC_DEV_ACCESS_TOKEN to work against a local backend without Supabase.',
    );
  }

  return { url, anonKey };
}

export const isSupabaseConfigured =
  !!env.NEXT_PUBLIC_SUPABASE_URL && !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
