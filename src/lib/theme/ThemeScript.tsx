import { ACCENTS, DEFAULT_PREFERENCES, STORAGE_KEY } from './preferences';

/**
 * Applies stored preferences to <html> before first paint.
 *
 * FRONTEND_TECHNICAL_DESIGN §8.1: "Set the theme attribute before first paint
 * with a blocking inline script in <head>, or every reload flashes dark before
 * switching to light."
 *
 * This duplicates a few lines of `applyPreferences` on purpose. The script has
 * to be self-contained — it runs before any bundle has loaded — so it cannot
 * import the real implementation. It is kept minimal for that reason; anything
 * more elaborate belongs in the React layer, which runs a moment later.
 *
 * Note for when the CSP of FR-NFR-SEC-08 lands: this is an inline script and
 * will need a nonce threaded through from middleware.
 */
export function ThemeScript() {
  const accentMap = Object.fromEntries(
    ACCENTS.map((accent) => [accent.id, { dark: accent.dark, light: accent.light }]),
  );

  const script = `
(function () {
  try {
    var d = ${JSON.stringify(DEFAULT_PREFERENCES)};
    var accents = ${JSON.stringify(accentMap)};
    var p = d;
    try {
      var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
      if (raw) { var s = JSON.parse(raw); if (s && typeof s === 'object') p = Object.assign({}, d, s); }
    } catch (e) {}

    var root = document.documentElement;
    var theme = p.theme === 'light' ? 'light' : 'dark';
    var accent = (accents[p.accent] || accents[d.accent])[theme];
    var n = parseInt(accent.slice(1), 16);
    var rgb = ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-tex', p.texture || d.texture);
    root.setAttribute('data-density', p.density || d.density);
    root.setAttribute('data-type', p.typeEmphasis || d.typeEmphasis);
    root.setAttribute('data-layout', p.blockLayout || d.blockLayout);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-soft', 'rgba(' + rgb + ', 0.14)');
    root.style.setProperty('--selection', 'rgba(' + rgb + ', 0.15)');
    root.style.colorScheme = theme;
  } catch (e) {
    // Never let a preferences failure block rendering the app.
  }
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
