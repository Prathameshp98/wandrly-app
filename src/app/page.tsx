import Link from 'next/link';

/**
 * Placeholder. This route becomes the Dashboard (FR-DASH-*) in phase 1, inside
 * the `(app)` route group with the sidebar and utility bar around it.
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--pad)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '52ch' }}>
        <p
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          Wandrly · phase 0
        </p>
        <h1
          style={{
            marginTop: 8,
            fontFamily: 'var(--f-display)',
            fontSize: 'clamp(26px, 2.8vw, 34px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
          }}
        >
          Foundation in place.
        </h1>
        <p style={{ marginTop: 10, color: 'var(--text-2)' }}>
          The token layer is ported and the design system is live. The dashboard lands in phase 1.
        </p>
        <p style={{ marginTop: 22 }}>
          <Link
            href="/dev/tokens"
            style={{
              display: 'inline-block',
              padding: '9px 18px',
              borderRadius: 999,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Design tokens →
          </Link>
        </p>
      </div>
    </main>
  );
}
