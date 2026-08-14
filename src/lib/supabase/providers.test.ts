import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthCapabilities, resetAuthCapabilities } from './providers';

/**
 * A button for a provider the project has not enabled fails at the redirect with
 * an error the user cannot act on — they click "Continue with Google" and land
 * on an error page. This project currently enables `email` only, so both OAuth
 * buttons have to stay hidden until someone turns them on.
 */
describe('getAuthCapabilities', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  function settings(body: unknown, ok = true) {
    return new Response(JSON.stringify(body), { status: ok ? 200 : 500 });
  }

  beforeEach(() => {
    resetAuthCapabilities();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAuthCapabilities();
  });

  it('reports only the providers the project enables', async () => {
    // The live shape from this project: email on, every OAuth provider off.
    fetchMock.mockResolvedValue(
      settings({ external: { email: true, google: false, apple: false, github: false } }),
    );

    await expect(getAuthCapabilities()).resolves.toMatchObject({ oauthProviders: [] });
  });

  it('surfaces a provider once it is turned on', async () => {
    fetchMock.mockResolvedValue(settings({ external: { google: true, apple: false } }));

    const { oauthProviders } = await getAuthCapabilities();
    expect(oauthProviders).toEqual(['google']);
  });

  it('ignores providers we have no button for', async () => {
    fetchMock.mockResolvedValue(settings({ external: { github: true, discord: true } }));

    const { oauthProviders } = await getAuthCapabilities();
    expect(oauthProviders).toEqual([]);
  });

  it('keeps the declared order rather than the response order', async () => {
    fetchMock.mockResolvedValue(settings({ external: { apple: true, google: true } }));

    const { oauthProviders } = await getAuthCapabilities();
    expect(oauthProviders).toEqual(['google', 'apple']);
  });

  it('reads the email-confirmation setting rather than assuming it', async () => {
    fetchMock.mockResolvedValue(settings({ external: {}, mailer_autoconfirm: true }));
    await expect(getAuthCapabilities()).resolves.toMatchObject({ emailAutoConfirm: true });
  });

  it('reports sign-ups being closed', async () => {
    fetchMock.mockResolvedValue(settings({ external: {}, disable_signup: true }));
    await expect(getAuthCapabilities()).resolves.toMatchObject({ signUpEnabled: false });
  });

  it('withholds every provider when the project cannot be reached', async () => {
    // Failing closed: showing a button we cannot stand behind is worse than
    // showing none, since email and magic link still work.
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(getAuthCapabilities()).resolves.toMatchObject({ oauthProviders: [] });
  });

  it('withholds every provider on a non-200', async () => {
    fetchMock.mockResolvedValue(settings({}, false));
    await expect(getAuthCapabilities()).resolves.toMatchObject({ oauthProviders: [] });
  });

  it('asks the project once, not once per render', async () => {
    fetchMock.mockResolvedValue(settings({ external: { google: true } }));

    await Promise.all([getAuthCapabilities(), getAuthCapabilities(), getAuthCapabilities()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the anon key, which the settings endpoint requires', async () => {
    fetchMock.mockResolvedValue(settings({ external: {} }));
    await getAuthCapabilities();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://test.supabase.co/auth/v1/settings');
    expect((init.headers as Record<string, string>).apikey).toBe('test-anon-key');
  });
});
