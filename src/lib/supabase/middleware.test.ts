import { describe, expect, it } from 'vitest';
import { isPublicPath } from './middleware';

describe('isPublicPath', () => {
  it('lets a share link through unauthenticated', () => {
    // FR-SHARE-02 and the Lurker persona: a share link has to render for
    // someone who has never signed in, and never will.
    expect(isPublicPath('/p/abc123')).toBe(true);
    expect(isPublicPath('/p/abc123/anything')).toBe(true);
  });

  it('lets an invite landing through unauthenticated', () => {
    // FR-AUTH-04: the invite page shows the trip cover and inviter *before*
    // asking anyone to sign up.
    expect(isPublicPath('/invite/tok_abc')).toBe(true);
  });

  it('covers every auth screen, including both reset steps', () => {
    for (const path of [
      '/sign-in',
      '/sign-up',
      '/auth/callback',
      '/forgot-password',
      '/reset-password',
    ]) {
      expect(isPublicPath(path), path).toBe(true);
    }
  });

  it('keeps query strings from changing the verdict', () => {
    expect(isPublicPath('/sign-in')).toBe(true);
    expect(isPublicPath('/sign-in/')).toBe(true);
  });

  it('guards everything else', () => {
    for (const path of [
      '/',
      '/shared',
      '/invites',
      '/archive',
      '/settings',
      '/f/folder-1',
      '/t/trip-1',
      '/t/trip-1/map',
      '/t/trip-1/expenses',
    ]) {
      expect(isPublicPath(path), path).toBe(false);
    }
  });

  it('does not treat a lookalike prefix as public', () => {
    // `/invites` is the authenticated inbox; `/invite/` is the public landing.
    // One character apart, and getting it wrong exposes the wrong one.
    expect(isPublicPath('/invites')).toBe(false);
    expect(isPublicPath('/private')).toBe(false);
    expect(isPublicPath('/psychic')).toBe(false);
  });

  it('matches on a segment boundary, so a longer route cannot slip past', () => {
    // A bare startsWith would make every one of these public.
    for (const path of [
      '/sign-in-with-sso',
      '/sign-uploads',
      '/auth/callbacks',
      '/reset-password-admin',
      '/packing',
    ]) {
      expect(isPublicPath(path), path).toBe(false);
    }
  });

  it('accepts a deeper public path', () => {
    expect(isPublicPath('/p/abc/photos')).toBe(true);
    expect(isPublicPath('/invite/tok/accept')).toBe(true);
  });
});
