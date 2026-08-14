import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UNTYPED_OPERATIONS } from '@/types/domain';

/**
 * Keeps `api/untyped.ts` honest against the contract it stands in for.
 *
 * The stand-ins exist because 21 operations declare a bare `{ type: "object" }`
 * with no properties, which openapi-typescript renders as `Record<string,
 * never>`. They are a liability: hand-written guesses the server never promised
 * to keep. This test fails the moment that set changes, in either direction:
 *
 *   - The backend types an operation -> delete its stand-in and its entry.
 *   - A new operation arrives untyped -> add one, deliberately.
 *
 * Without this, a fixed operation keeps flowing through a hand-written type
 * forever, and a newly-untyped one silently becomes `Record<string, never>` at
 * some unlucky call site.
 */

const SPEC_PATH = join(process.cwd(), '../../backend/wandrly-backend/openapi.json');

interface Schema {
  type?: string;
  properties?: Record<string, unknown>;
  additionalProperties?: unknown;
  $ref?: string;
  allOf?: unknown;
  oneOf?: unknown;
}

interface Operation {
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
}

const METHODS = ['get', 'post', 'patch', 'put', 'delete'] as const;

/** True for a schema that generates as `Record<string, never>`. */
function isEmptyObjectSchema(schema: Schema | undefined): boolean {
  if (!schema) return false;
  return (
    schema.type === 'object' &&
    !schema.$ref &&
    !schema.allOf &&
    !schema.oneOf &&
    !schema.additionalProperties &&
    Object.keys(schema.properties ?? {}).length === 0
  );
}

function findUntypedOperations(): string[] {
  const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8')) as {
    paths: Record<string, Record<string, Operation>>;
  };

  const found: string[] = [];
  for (const [path, operations] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const operation = operations[method];
      if (!operation?.responses) continue;

      for (const [status, response] of Object.entries(operation.responses)) {
        if (!status.startsWith('2') || status === '204') continue;
        if (isEmptyObjectSchema(response.content?.['application/json']?.schema)) {
          found.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
  }
  return found.sort();
}

describe('untyped operations', () => {
  const found = findUntypedOperations();

  // The five export routes stream a PDF, .ics, plain text or CSV rather than
  // JSON, so `apiBlob` handles them and they need no stand-in type.
  const NON_JSON = [
    'GET /v1/trips/{tripId}/export.pdf',
    'GET /v1/trips/{tripId}/export.ics',
    'GET /v1/trips/{tripId}/export.txt',
    'GET /v1/trips/{tripId}/expenses/export.csv',
    'GET /v1/media/{id}/content',
  ];

  it('matches the set we wrote stand-ins for', () => {
    const needingTypes = found.filter((operation) => !NON_JSON.includes(operation)).sort();
    const declared = [...UNTYPED_OPERATIONS].sort();

    const nowTyped = declared.filter((operation) => !needingTypes.includes(operation));
    const newlyUntyped = needingTypes.filter(
      (operation) => !declared.includes(operation as (typeof UNTYPED_OPERATIONS)[number]),
    );

    expect(
      nowTyped,
      `The backend now types these. Delete their stand-ins from src/lib/api/untyped.ts, ` +
        `remove them from UNTYPED_OPERATIONS, re-run \`npm run api:types\`, and follow ` +
        `the type errors:\n  ${nowTyped.join('\n  ')}`,
    ).toEqual([]);

    expect(
      newlyUntyped,
      `These arrived without a typed response body. Add a stand-in to ` +
        `src/lib/api/untyped.ts before using them, or they will be ` +
        `Record<string, never> at the call site:\n  ${newlyUntyped.join('\n  ')}`,
    ).toEqual([]);
  });

  it('still counts 21, as API_CONTRACT §8 records', () => {
    expect(found).toHaveLength(21);
  });
});
