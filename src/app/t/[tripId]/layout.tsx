import { ToastViewport } from '@/components/primitives';

/**
 * The canvas takeover.
 *
 * Deliberately a sibling of `(app)` rather than a child: the canvas is a
 * full-screen surface and must not inherit the dashboard's sidebar chrome
 * (§4). It brings its own toast viewport, since it is outside the app shell
 * that mounts the other one.
 */
export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}
