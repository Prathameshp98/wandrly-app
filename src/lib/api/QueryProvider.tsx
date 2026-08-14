'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError, NotAuthenticatedError } from './errors';

/**
 * TanStack Query's retry policy has to agree with the fetch client's, or the
 * two layers multiply: three retries inside `api()` under three more out here
 * is nine requests for one failed mutation.
 *
 * `api()` already retries 429 and 503 with backoff, so by the time an error
 * reaches Query it has been through that. Query retries nothing.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof NotAuthenticatedError) return false;

  if (error instanceof ApiError) {
    // Never retry a conflict — FR-COLLAB-07 wants a human decision — and never
    // retry a 4xx, which will fail identically every time.
    if (error.isConflict || error.status < 500) return false;
  }

  // One extra attempt for anything that got past the client's own retries,
  // which in practice means a transport failure Query saw and it did not.
  return failureCount < 1;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The canvas is one cache entry mutated locally (§6.4), so refetching
        // it on every window focus would fight optimistic updates in flight.
        refetchOnWindowFocus: false,
        // Long enough that navigating back to the dashboard is instant, short
        // enough that a collaborator's change is not stale for a whole session.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
      },
      mutations: {
        // FR-NFR-REL-03: no edit is ever silently lost. A mutation that fails
        // surfaces to its own onError, which rolls back and shows a retryable
        // error; retrying here would hide the failure instead.
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created in state, not at module scope: a module-level client would be
  // shared across requests on the server and leak one user's data into
  // another's render.
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
