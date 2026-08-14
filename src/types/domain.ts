import type { paths } from '@/lib/api/schema.d';
import type {
  UntypedDashboard,
  UntypedExpense,
  UntypedExpensePage,
  UntypedMediaAsset,
  UntypedMediaList,
  UntypedMediaUsage,
  UntypedMyBalances,
  UntypedShareLink,
} from '@/lib/api/untyped';

/**
 * Domain types, derived from the generated schema rather than hand-written.
 *
 * The API has no `components.schemas` beyond `Error` — every response is inlined
 * at its path — so these helpers pull the shapes back out. Deriving them means a
 * contract change surfaces as a type error at the call site instead of as a
 * runtime surprise, which is the whole reason §6.1 insists on generated types.
 */

type JsonResponse<T> = T extends { content: { 'application/json': infer B } } ? B : never;

/** The 200 body of a GET. */
export type GetResponse<P extends keyof paths> = paths[P] extends {
  get: { responses: { 200: infer R } };
}
  ? JsonResponse<R>
  : never;

/** The 200 or 201 body of a POST. */
export type PostResponse<P extends keyof paths> = paths[P] extends {
  post: { responses: infer R };
}
  ? R extends { 201: infer Created }
    ? JsonResponse<Created>
    : R extends { 200: infer Ok }
      ? JsonResponse<Ok>
      : never
  : never;

export type PatchResponse<P extends keyof paths> = paths[P] extends {
  patch: { responses: { 200: infer R } };
}
  ? JsonResponse<R>
  : never;

/** The JSON request body of a POST. */
export type PostBody<P extends keyof paths> = paths[P] extends {
  post: { requestBody?: { content: { 'application/json': infer B } } };
}
  ? B
  : never;

export type PatchBody<P extends keyof paths> = paths[P] extends {
  patch: { requestBody?: { content: { 'application/json': infer B } } };
}
  ? B
  : never;

export type PutBody<P extends keyof paths> = paths[P] extends {
  put: { requestBody?: { content: { 'application/json': infer B } } };
}
  ? B
  : never;

/** Query parameters of a GET. */
export type GetQuery<P extends keyof paths> = paths[P] extends {
  get: { parameters: { query?: infer Q } };
}
  ? Q
  : never;

/* ── Element helper ───────────────────────────────────────────────────────── */

type Element<T> = T extends readonly (infer E)[] ? E : never;

/* ── Trips ────────────────────────────────────────────────────────────────── */

// The dashboard is declared as a bare `{ type: "object" }`, so the generated
// type is `Record<string, never>` and every property access would be an error.
// The stand-in lives in api/untyped.ts; see the note at the top of that file.
export type Dashboard = UntypedDashboard;
export type DashboardTrip = Dashboard['items'][number];
export type DashboardStats = Dashboard['stats'];

export type TripList = GetResponse<'/v1/trips'>;
export type TripSummary = Element<TripList['items']>;

export type Trip = GetResponse<'/v1/trips/{tripId}'>;
export type CreateTripBody = PostBody<'/v1/trips'>;
export type UpdateTripBody = PatchBody<'/v1/trips/{tripId}'>;

/** `?view=` on GET /v1/trips. Note it is `archive`, not `archived`. */
export type TripView = NonNullable<NonNullable<GetQuery<'/v1/trips'>>['view']>;

/* ── Canvas ───────────────────────────────────────────────────────────────── */

export type Canvas = GetResponse<'/v1/trips/{tripId}/canvas'>;
export type Day = Element<Canvas['days']>;
export type Block = Element<Day['blocks']>;
export type BlockSections = Block['sections'];
export type Variant = Canvas['variant'];

export type CreateBlockBody = PostBody<'/v1/trips/{tripId}/days/{id}/blocks'>;
export type UpdateBlockBody = PatchBody<'/v1/trips/{tripId}/blocks/{id}'>;
export type UpdateDayBody = PatchBody<'/v1/trips/{tripId}/days/{id}'>;

/* ── Collaboration ────────────────────────────────────────────────────────── */

export type Members = GetResponse<'/v1/trips/{tripId}/members'>;
export type Member = Element<Members['items']>;
export type MemberRole = Member['role'];

export type Comments = GetResponse<'/v1/trips/{tripId}/comments'>;
export type Comment = Element<Comments['items']>;

export type Suggestions = GetResponse<'/v1/trips/{tripId}/suggestions'>;
export type Suggestion = Element<Suggestions['items']>;

export type Invites = GetResponse<'/v1/invites'>;
export type Invite = Element<Invites['items']>;

/* ── Folders and notifications ────────────────────────────────────────────── */

export type Folders = GetResponse<'/v1/folders'>;
export type Folder = Element<Folders['items']>;
export type CreateFolderBody = PostBody<'/v1/folders'>;

export type Notifications = GetResponse<'/v1/notifications'>;
export type Notification = Element<Notifications['items']>;

/* ── Panels ───────────────────────────────────────────────────────────────── */

export type TripMap = GetResponse<'/v1/trips/{tripId}/map'>;
export type MapPin = Element<TripMap['pins']>;
export type Packing = GetResponse<'/v1/trips/{tripId}/packing'>;
export type PackingItem = Element<Packing['items']>;
export type TripNotes = GetResponse<'/v1/trips/{tripId}/notes'>;
export type Activity = GetResponse<'/v1/trips/{tripId}/activity'>;

/* ── Sharing ──────────────────────────────────────────────────────────────── */

/** Untyped in the contract. Null when no share link exists yet. */
export type ShareLink = UntypedShareLink;

/* ── Ledger (phase 7) ─────────────────────────────────────────────────────── */

export type Participants = GetResponse<'/v1/trips/{tripId}/participants'>;
export type Participant = Element<Participants['items']>;
// Untyped in the contract — the whole expense read path, as the doc predicted.
export type ExpensePage = UntypedExpensePage;
export type Expense = UntypedExpense;
export type MyBalances = UntypedMyBalances;
export type Balances = GetResponse<'/v1/trips/{tripId}/balances'>;
export type SettleUp = GetResponse<'/v1/trips/{tripId}/settle-up'>;

/** Filters for the one cursor-paginated list in the API. */
export type ExpenseFilters = Omit<
  NonNullable<GetQuery<'/v1/trips/{tripId}/expenses'>>,
  'cursor' | 'limit'
>;

/**
 * The operations whose 2xx body the contract leaves untyped, so the blast
 * radius is visible without opening api/untyped.ts. Delete an entry here when
 * the backend types it.
 */
export const UNTYPED_OPERATIONS = [
  'GET /v1/trips/dashboard',
  'GET /v1/trips/{tripId}/share',
  'GET /v1/trips/{tripId}/expenses',
  'POST /v1/trips/{tripId}/expenses',
  'GET /v1/me/balances',
  'GET /v1/media',
  'POST /v1/media',
  'PATCH /v1/media/{id}',
  'POST /v1/media/attach',
  'GET /v1/media/usage',
  'POST /v1/trips/{tripId}/invites',
  'POST /v1/invites/accept',
  'DELETE /v1/folders/{id}',
  'POST /v1/trips/{tripId}/settlements',
  'POST /v1/trips/{tripId}/settlements/{id}/confirm',
  'POST /v1/trips/{tripId}/settlements/{id}/void',
] as const;

/* ── Media ────────────────────────────────────────────────────────────────── */

// The media read path is untyped apart from search.
export type MediaList = UntypedMediaList;
export type MediaAsset = UntypedMediaAsset;
export type MediaUsage = UntypedMediaUsage;
export type MediaSearch = GetResponse<'/v1/media/search'>;

/* ── Search and places ────────────────────────────────────────────────────── */

export type SearchResults = GetResponse<'/v1/search'>;
export type PlaceResults = GetResponse<'/v1/places/search'>;

/* ── Cross-cutting ────────────────────────────────────────────────────────── */

/**
 * Anything carrying an optimistic-concurrency version. Trips, days, blocks and
 * notes all do; always send back the version you last read (§6.5).
 */
export interface Versioned {
  id: string;
  version: number;
}
