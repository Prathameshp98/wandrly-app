import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/**
 * Routes reachable without a session.
 *
 * `/p/` and `/invite/` are deliberately here: a share link and an invite both
 * have to render for someone who has never signed in — that is the Lurker and
 * the Crew Member personas, and FR-SHARE-02 and FR-AUTH-04 depend on it.
 */
const PUBLIC_PREFIXES = [
  '/p',
  '/invite',
  // The design-system reference pages. They render no user data and exist to be
  // compared against the prototype, so guarding them only means signing in to
  // look at a colour swatch. They are excluded from production builds.
  '/dev',
  '/sign-in',
  '/sign-up',
  '/auth/callback',
  '/forgot-password',
  '/reset-password',
] as const;

/**
 * A segment-boundary match, not a bare `startsWith`. `/sign-in-with-sso` and
 * `/invites` both begin with a public prefix while being entirely different
 * routes — the first would slip past the guard, and the second is the
 * authenticated invite inbox, one character from the public landing page.
 */
export function isPublicPath(pathname: string): boolean {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PUBLIC_PREFIXES.some(
    (prefix) => normalised === prefix || normalised.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase session and guards private routes.
 *
 * `getUser()` is what refreshes the cookie, so it has to be called on every
 * request — including public ones, or a visitor who lands on a share link first
 * arrives at the app with an expired session.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured there is no session to refresh and no way to
  // authenticate, so guarding would lock every route behind a sign-in page that
  // cannot work. This is the local dev-token path; see lib/supabase/token.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const signIn = new URL('/sign-in', request.url);
    // Preserve where they were headed so sign-in can return them there — a
    // deep link to a trip should survive an expired session.
    signIn.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  return response;
}
