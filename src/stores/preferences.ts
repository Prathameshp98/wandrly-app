'use client';

import { create } from 'zustand';
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  applyPreferences,
  readStoredPreferences,
  writeStoredPreferences,
} from '@/lib/theme/preferences';

interface PreferencesState {
  preferences: Preferences;
  /** False until the store has read localStorage, so SSR and first paint agree. */
  hydrated: boolean;
  hydrate: () => void;
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
}

/**
 * Appearance preferences are genuinely global, genuinely ephemeral client state,
 * which is exactly what FRONTEND_TECHNICAL_DESIGN §2 reserves Zustand for. They
 * are not server state — there is no route behind them (API_CONTRACT §9).
 *
 * The inline script in ThemeScript has already written these attributes onto
 * <html> before paint. This store is the read/write surface for the settings UI
 * afterwards; it re-applies on change so the two never disagree.
 */
export const usePreferences = create<PreferencesState>((set, get) => ({
  preferences: DEFAULT_PREFERENCES,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const preferences = readStoredPreferences();
    set({ preferences, hydrated: true });
    if (typeof document !== 'undefined') {
      applyPreferences(preferences, document.documentElement);
    }
  },

  set: (key, value) => {
    const preferences = { ...get().preferences, [key]: value };
    set({ preferences });
    writeStoredPreferences(preferences);
    if (typeof document !== 'undefined') {
      applyPreferences(preferences, document.documentElement);
    }
  },

  reset: () => {
    set({ preferences: DEFAULT_PREFERENCES });
    writeStoredPreferences(DEFAULT_PREFERENCES);
    if (typeof document !== 'undefined') {
      applyPreferences(DEFAULT_PREFERENCES, document.documentElement);
    }
  },
}));
