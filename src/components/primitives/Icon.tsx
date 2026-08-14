import type { SVGProps } from 'react';

/**
 * The UI icon set, ported path for path from `WANDRLY 2/icons.jsx`.
 *
 * House style, from PRD §12: single-stroke line work, 1.6px, `currentColor`,
 * 24×24 viewBox. The handful of filled details (the dots in `Dots`, the compass
 * needle, the pin's centre) set `stroke="none"` explicitly, exactly as the
 * prototype does — without it they pick up the parent stroke and thicken.
 *
 * Icons are decorative by default and hidden from assistive tech. Pass a
 * `title` only when an icon is the sole content of a control, and prefer giving
 * the control itself an accessible name.
 */

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  /** Makes the icon a labelled image instead of decoration. */
  title?: string;
}

function Icon({ children, size = 16, title, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const I = {
  Search: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  ),
  Plus: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  Dots: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </Icon>
  ),
  Compass: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2.6 6.4-3.6-3.4 6.2-3z" fill="currentColor" stroke="none" />
    </Icon>
  ),
  Map: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 6 9 4l6 2 6-2v14l-6 2-6-2-6 2V6Z" />
      <path d="M9 4v16M15 6v16" />
    </Icon>
  ),
  Pin: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z" />
      <circle cx="12" cy="9" r="2.4" fill="currentColor" stroke="none" />
    </Icon>
  ),
  Folder: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2H20a1 1 0 0 1 1 1v9.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
    </Icon>
  ),
  Calendar: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    </Icon>
  ),
  Users: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="9" cy="9" r="3.4" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M15.5 7.5a3 3 0 0 1 0 5" />
      <path d="M17 14c2.5.6 4 2.6 4 5" />
    </Icon>
  ),
  Star: (p: IconProps) => (
    <Icon {...p}>
      <path d="m12 3.5 2.6 5.5 6 .7-4.4 4.1 1.2 6L12 16.8 6.6 19.8l1.2-6L3.4 9.7l6-.7L12 3.5Z" />
    </Icon>
  ),
  Share: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.3 10.8 15.7 7.2M8.3 13.2l7.4 3.6" />
    </Icon>
  ),
  Pencil: (p: IconProps) => (
    <Icon {...p}>
      <path d="M14.5 4.5 19 9l-9.5 9.5-5 1 1-5 9-9Z" />
    </Icon>
  ),
  Trash: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l1 12.5A1.5 1.5 0 0 0 9 21h6a1.5 1.5 0 0 0 1.5-1.5L17.5 7" />
    </Icon>
  ),
  Bell: (p: IconProps) => (
    <Icon {...p}>
      <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </Icon>
  ),
  Inbox: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 4h18v10l-4 1-1 3h-8l-1-3-4-1V4Z" />
      <path d="M7 4v6h10V4" />
    </Icon>
  ),
  Settings: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.3.8a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.5 2.8a7.6 7.6 0 0 0-2.6 1.5l-2.3-.8-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.3-.8a7.6 7.6 0 0 0 2.6 1.5l.5 2.8h4l.5-2.8a7.6 7.6 0 0 0 2.6-1.5l2.3.8 2-3.4-2-1.6Z" />
    </Icon>
  ),
  Help: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9a2.6 2.6 0 1 1 4.4 2c-.8.7-1.8 1-1.8 2.4M12 17.2h.01" />
    </Icon>
  ),
  Archive: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3" y="4.5" width="18" height="4" rx="1" />
      <path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" />
    </Icon>
  ),
  Sparkle: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </Icon>
  ),
  Grid: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </Icon>
  ),
  List: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </Icon>
  ),
  ArrowR: (p: IconProps) => (
    <Icon {...p}>
      <path d="M5 12h14M14 6l6 6-6 6" />
    </Icon>
  ),
  Globe: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
    </Icon>
  ),
  Mountain: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 19 9 9l4 5 2-3 6 8H3Z" />
      <circle cx="16" cy="6" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  ),
  Suitcase: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M8 7V5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5v2M3 12h18" />
    </Icon>
  ),
  Check: (p: IconProps) => (
    <Icon {...p}>
      <path d="m5 12 4.5 4.5L19 7" />
    </Icon>
  ),
  Chevron: (p: IconProps) => (
    <Icon {...p}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  ),
  ChevronD: (p: IconProps) => (
    <Icon {...p}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  Chat: (p: IconProps) => (
    <Icon {...p}>
      <path
        d="M21 12a9 9 0 1 1-4.6-7.8L21 3l-1.1 4.5A8.9 8.9 0 0 1 21 12Z"
        transform="rotate(180 12 12)"
      />
      <path d="M8.5 10.5h7M8.5 14h4.5" />
    </Icon>
  ),
  Send: (p: IconProps) => (
    <Icon {...p}>
      <path d="M21.5 2.5 10 14M21.5 2.5 14.5 21.5l-4.5-7.5L2.5 9.5l19-7Z" />
    </Icon>
  ),
  Mail: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </Icon>
  ),
  XBrand: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4 4l16 16M20 4 4 20" />
    </Icon>
  ),
} as const;

export type IconName = keyof typeof I;
export const ICON_NAMES = Object.keys(I) as IconName[];
