import type { Metadata, Viewport } from 'next';
import { Instrument_Sans } from 'next/font/google';
import { ThemeScript } from '@/lib/theme/ThemeScript';
import { DEFAULT_PREFERENCES } from '@/lib/theme/preferences';
import './globals.css';

/**
 * D-08 settled as all-sans, so this is the only family the app loads. The
 * prototype's <link> to Google Fonts does not ship — FR-NFR-SEC-08 requires a
 * strict CSP with no third-party script or style origins, and next/font
 * self-hosts the files at build time.
 */
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'Wandrly',
    template: '%s · Wandrly',
  },
  description:
    'A collaborative canvas for planning a trip — the itinerary, the research, the bookings, the costs, and the crew in one place.',
  applicationName: 'Wandrly',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The theme colour has to track the active theme; the inline script cannot
  // reach this tag, so both are declared and the browser picks by media query.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0B0E' },
    { media: '(prefers-color-scheme: light)', color: '#F2F3F6' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={instrumentSans.variable}
      // These match what ThemeScript writes before paint. Declaring them here
      // too means the server-rendered markup is already correct for a visitor
      // with no stored preference, so there is nothing to correct on hydration.
      data-theme={DEFAULT_PREFERENCES.theme}
      data-tex={DEFAULT_PREFERENCES.texture}
      data-density={DEFAULT_PREFERENCES.density}
      data-type={DEFAULT_PREFERENCES.typeEmphasis}
      data-layout={DEFAULT_PREFERENCES.blockLayout}
      style={{ colorScheme: DEFAULT_PREFERENCES.theme }}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
