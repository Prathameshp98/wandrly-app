import type { GetResponse } from '@/types/domain';

/**
 * Hand-written stand-ins for the operations the OpenAPI document declares as a
 * bare `{ type: "object" }` with no properties. openapi-typescript renders those
 * as `Record<string, never>`, which is worse than `any`: every property access
 * is a type error, so without these the call sites would have to cast.
 *
 * 21 of the 99 operations are affected (API_CONTRACT §8). Five of them return
 * non-JSON — the three exports and the CSV and media content routes — and are
 * handled by `apiBlob`, so they need nothing here. The rest are below.
 *
 * **Every type in this file is a guess that the server is not obliged to keep.**
 * They are quarantined here, rather than spread across hooks, so that when the
 * backend types an operation the fix is: delete the entry, re-run
 * `npm run api:types`, and follow the type errors. The shapes were read off the
 * live API rather than inferred from the PRD, and
 * `contract.integration.test.ts` checks them against a running server.
 *
 * Ordered worst-first: the dashboard and the expense read path are the two that
 * hurt most, exactly as the frontend design doc predicted.
 */

/* ── Dashboard ────────────────────────────────────────────────────────────── */

/**
 * `GET /v1/trips/dashboard`
 *
 * Verified identical, key for key, to the typed `GET /v1/trips` item shape, so
 * this borrows that rather than restating 29 fields that would then drift.
 */
export type UntypedTripSummary = NonNullable<GetResponse<'/v1/trips'>['items']>[number];

export interface UntypedDashboard {
  items: UntypedTripSummary[];
  stats: {
    tripCount: number;
    daysPlanned: number;
    crewCount: number;
    /** null when no trip has a future start date — the spotlight is then hidden. */
    nextTripId: string | null;
  };
}

/* ── Sharing ──────────────────────────────────────────────────────────────── */

/** `GET /v1/trips/{tripId}/share` — null when no link has been created. */
export type UntypedShareLink = {
  slug: string;
  url: string;
  isEnabled: boolean;
  allowComments: boolean;
  allowSuggestions: boolean;
  hasPassword: boolean;
  expiresAt: string | null;
  variantId: string | null;
  createdAt: string;
  updatedAt: string;
} | null;

/* ── Invites ──────────────────────────────────────────────────────────────── */

/** `POST /v1/trips/{tripId}/invites` */
export interface UntypedInviteCreated {
  id: string;
  email: string;
  role: 'EDITOR' | 'CONTRIBUTOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

/** `POST /v1/invites/accept` */
export interface UntypedInviteAccepted {
  tripId: string;
  role: 'OWNER' | 'EDITOR' | 'CONTRIBUTOR' | 'VIEWER';
}

/* ── Folders ──────────────────────────────────────────────────────────────── */

/**
 * `DELETE /v1/folders/{id}`
 *
 * Declared with a body but documented as unfiling rather than deleting the
 * trips inside. Treated as empty; if it does return a count, the call site
 * ignores it today.
 */
export type UntypedFolderDeleted = void;

/* ── Media ────────────────────────────────────────────────────────────────── */

export interface UntypedMediaAsset {
  id: string;
  url: string;
  /** PENDING until the validation job clears magic bytes and strips EXIF. */
  state: 'PENDING' | 'READY' | 'FAILED';
  source: 'UPLOAD' | 'UNSPLASH' | 'URL';
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  /**
   * An average tone, not a real blurhash — the API generates no derivative
   * sizes, so next/image owns resizing and placeholders (§12).
   */
  placeholder: string | null;
  /** Mandatory and structural wherever the image renders at meaningful size. */
  attributionLabel: string | null;
  attributionUrl: string | null;
  createdAt: string;
}

/** `GET /v1/media` */
export interface UntypedMediaList {
  items: UntypedMediaAsset[];
}

/** `POST /v1/media` — multipart/form-data, not presigned direct-to-S3 (§4.7). */
export type UntypedMediaUploaded = UntypedMediaAsset;

/** `PATCH /v1/media/{id}` */
export type UntypedMediaUpdated = UntypedMediaAsset;

/** `POST /v1/media/attach` */
export type UntypedMediaAttached = UntypedMediaAsset;

/** `GET /v1/media/usage` — FR-NFR: 100 MB per user. */
export interface UntypedMediaUsage {
  usedBytes: number;
  quotaBytes: number;
  assetCount: number;
}

/* ── Ledger (phase 7) ─────────────────────────────────────────────────────── */

/**
 * The ledger has no design yet, so these are placeholders shaped from the
 * contract rather than from a screen. Revisit all of them when phase 7 starts.
 *
 * Every monetary field is a decimal string in minor units. A `number` here
 * would be a defect, not a convenience.
 */

/** `GET /v1/me/balances` — the cross-trip summary on the dashboard. */
export interface UntypedMyBalances {
  items: Array<{
    tripId: string;
    tripTitle: string;
    baseCurrency: string;
    /** Signed: negative means you owe. */
    netMinor: string;
  }>;
}

/** `GET /v1/trips/{tripId}/expenses` — the only cursor-paginated list. */
export interface UntypedExpensePage {
  items: UntypedExpense[];
  /** null means the end. Do not treat a missing key as "more". */
  nextCursor: string | null;
}

export interface UntypedExpense {
  id: string;
  tripId: string;
  description: string;
  category: string;
  currency: string;
  amountMinor: string;
  spentAt: string;
  blockId: string | null;
  splitMethod: 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES' | 'ADJUSTMENT';
  payments: Array<{ participantId: string; amountMinor: string }>;
  shares: Array<{ participantId: string; amountMinor: string }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** `POST /v1/trips/{tripId}/expenses` */
export type UntypedExpenseCreated = UntypedExpense;

export interface UntypedSettlement {
  id: string;
  tripId: string;
  fromParticipantId: string;
  toParticipantId: string;
  currency: string;
  amountMinor: string;
  method: 'UPI' | 'BANK' | 'CASH' | 'OTHER';
  confirmedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
}

/** `POST /v1/trips/{tripId}/settlements` and its confirm/void siblings. */
export type UntypedSettlementCreated = UntypedSettlement;
export type UntypedSettlementConfirmed = UntypedSettlement;
export type UntypedSettlementVoided = UntypedSettlement;
