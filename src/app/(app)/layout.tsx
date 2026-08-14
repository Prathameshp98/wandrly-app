import { AppShell } from '@/components/shell/AppShell';

/**
 * The authenticated shell.
 *
 * `(app)` and `t/[tripId]` are siblings rather than parent and child, because
 * the canvas is a full-screen takeover that must not inherit this sidebar
 * (§4). Route groups do not affect the URL, so `(app)/page.tsx` is still `/`.
 *
 * Default to client components inside here: the app is interactive, optimistic
 * and realtime, and server components buy nothing while complicating the Query
 * cache (§9.1).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
