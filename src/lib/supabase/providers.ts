import { env, isSupabaseConfigured } from '@/lib/env';

/**
 * Which OAuth providers this Supabase project actually has configured.
 *
 * FR-AUTH-01 asks for Google and Apple, but a button for a provider the project
 * has not enabled fails at the redirect with an opaque error — the user clicks
 * "Continue with Google" and lands on an error page. Rather than hardcode a
 * list that drifts every time someone toggles a provider in the dashboard, this
 * asks the project what it supports.
 *
 * `/auth/v1/settings` is public, needs only the anon key, and its answer changes
 * about as often as the project's configuration does — so it is fetched once
 * per page load and memoised.
 */

/** The providers this app has a button for, in the order they should appear. */
export const SUPPORTED_OAUTH_PROVIDERS = ['google', 'apple'] as const;
export type OAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

interface AuthSettings {
  external?: Record<string, boolean>;
  disable_signup?: boolean;
  mailer_autoconfirm?: boolean;
}

export interface AuthCapabilities {
  /** Intersection of what we support and what the project enables. */
  oauthProviders: OAuthProvider[];
  /** False when the project has turned off new sign-ups. */
  signUpEnabled: boolean;
  /**
   * True when Supabase confirms addresses itself, meaning sign-up yields a
   * session immediately. False means the user must click a link in their email
   * first, and the sign-up screen has to say so.
   */
  emailAutoConfirm: boolean;
}

/** Assume the least, so a fetch failure never renders a button that cannot work. */
const CONSERVATIVE: AuthCapabilities = {
  oauthProviders: [],
  signUpEnabled: true,
  emailAutoConfirm: false,
};

let cached: Promise<AuthCapabilities> | undefined;

export function getAuthCapabilities(): Promise<AuthCapabilities> {
  if (!cached) cached = load();
  return cached;
}

async function load(): Promise<AuthCapabilities> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isSupabaseConfigured || !url || !anonKey) return CONSERVATIVE;

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
    });
    if (!response.ok) return CONSERVATIVE;

    const settings = (await response.json()) as AuthSettings;
    const external = settings.external ?? {};

    return {
      oauthProviders: SUPPORTED_OAUTH_PROVIDERS.filter((provider) => external[provider] === true),
      signUpEnabled: settings.disable_signup !== true,
      emailAutoConfirm: settings.mailer_autoconfirm === true,
    };
  } catch {
    // Offline, or the project is unreachable. Email and magic link still render;
    // only the provider buttons are withheld.
    return CONSERVATIVE;
  }
}

/** Test seam. */
export function resetAuthCapabilities(): void {
  cached = undefined;
}
