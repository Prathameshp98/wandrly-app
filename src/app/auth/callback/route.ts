import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPublicPath } from '@/lib/supabase/middleware';

/**
 * Exchanges a Supabase OAuth or magic-link code for a session cookie.
 *
 * One of the only two server-side surfaces in the app (§3). Everything else is
 * a client component talking to the API directly.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // Supabase reports a refused or expired link this way rather than by failing
  // the exchange, so it has to be read before anything else.
  const error = searchParams.get('error_description') ?? searchParams.get('error');
  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error)}`, origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=missing_code', origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(exchangeError.message)}`, origin),
    );
  }

  return NextResponse.redirect(new URL(safeRedirect(next), origin));
}

/**
 * `next` arrives from a query parameter, so it is attacker-controlled. Only a
 * same-origin path is ever followed — anything else would make this an open
 * redirect that laundered our domain's credibility. Sending someone back to a
 * public route would also be pointless, since they just signed in.
 */
function safeRedirect(next: string): string {
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  if (isPublicPath(next)) return '/';
  return next;
}
