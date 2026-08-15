import { describe, expect, it } from 'vitest';
import {
  BLOCK_META,
  BLOCK_TYPES,
  capabilitiesOf,
  crossesMidnight,
  isBookable,
  metaFor,
  startTimeOf,
} from './block-meta';
import type { Block } from '@/types/domain';

describe('the eleven block types', () => {
  it('is exactly eleven, as the PRD defines', () => {
    expect(BLOCK_TYPES).toHaveLength(11);
  });

  it('gives every one a label, description and colour pairing', () => {
    for (const type of BLOCK_TYPES) {
      expect(BLOCK_META[type].label, type).toBeTruthy();
      expect(BLOCK_META[type].description, type).toBeTruthy();
      expect(BLOCK_META[type].colour, type).toBeTruthy();
      expect(BLOCK_META[type].tint, type).toBeTruthy();
    }
  });

  it('falls back rather than crashing on a type from a newer server', () => {
    expect(metaFor('HOLOGRAM').label).toBe(BLOCK_META.NOTE.label);
  });
});

describe('isBookable', () => {
  it('covers exactly the four types that drive readiness', () => {
    // PRD §6.2. Widening this silently changes every readiness percentage in
    // the product.
    const bookable = BLOCK_TYPES.filter(isBookable);
    expect(bookable).toEqual(['ACCOMMODATION', 'TRANSPORT', 'RESTAURANT', 'TICKET']);
  });
});

describe('startTimeOf', () => {
  const block = (timeLabel: string) => ({ timeLabel }) as Pick<Block, 'timeLabel'>;

  it('takes the first clock time from a range', () => {
    expect(startTimeOf(block('02:45 → 13:20'))).toBe('02:45');
  });

  it('finds the time inside prose', () => {
    expect(startTimeOf(block('Check-in 16:00'))).toBe('16:00');
  });

  it('handles a bare time', () => {
    expect(startTimeOf(block('19:30'))).toBe('19:30');
  });

  it('takes the start of an overnight range, not the arrival', () => {
    expect(startTimeOf(block('20:35 → 02:15+1'))).toBe('20:35');
  });

  it('falls back to the text before a separator when there is no clock', () => {
    expect(startTimeOf(block('Morning · flexible'))).toBe('Morning');
  });

  it('shows the placeholder when a block has no time at all', () => {
    expect(startTimeOf(block(''))).toBe('—:—');
    expect(startTimeOf({ timeLabel: null } as unknown as Pick<Block, 'timeLabel'>)).toBe('—:—');
  });
});

describe('crossesMidnight', () => {
  it('recognises the +1 arrival marker', () => {
    // The case that turns a naive end-minus-start into a negative duration.
    expect(crossesMidnight({ timeLabel: '20:35 → 02:15+1' } as Pick<Block, 'timeLabel'>)).toBe(
      true,
    );
  });

  it('is false for a same-day range', () => {
    expect(crossesMidnight({ timeLabel: '02:45 → 13:20' } as Pick<Block, 'timeLabel'>)).toBe(false);
    expect(crossesMidnight({ timeLabel: '' } as Pick<Block, 'timeLabel'>)).toBe(false);
  });
});

describe('capabilitiesOf', () => {
  const withSections = (sections: Record<string, unknown>) => ({ sections }) as unknown as Block;

  it('lists only the sections a block actually has', () => {
    expect(capabilitiesOf(withSections({ map: { lat: 1, lng: 2 } }))).toEqual(['map']);
    expect(capabilitiesOf(withSections({}))).toEqual([]);
  });

  it('counts photos and gets the singular right', () => {
    expect(capabilitiesOf(withSections({ photos: ['a'] }))).toEqual(['1 photo']);
    expect(capabilitiesOf(withSections({ photos: ['a', 'b', 'c'] }))).toEqual(['3 photos']);
  });

  it('ignores empty collections rather than showing a zero', () => {
    expect(capabilitiesOf(withSections({ photos: [], booking: [] }))).toEqual([]);
  });

  it('keeps a stable order across every combination', () => {
    expect(
      capabilitiesOf(
        withSections({
          booking: [{ key: 'PNR', value: 'X' }],
          photos: ['a'],
          link: { url: 'x' },
          map: { lat: 1, lng: 2 },
        }),
      ),
    ).toEqual(['map', '1 photo', 'link', 'booking']);
  });
});
