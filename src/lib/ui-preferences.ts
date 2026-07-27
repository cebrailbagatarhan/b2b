'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale, ThemeMode } from '@/lib/i18n'

type UiPreferencesState = {
  theme: ThemeMode
  locale: Locale
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLocale: (locale: Locale) => void
}

export const THEME_STORAGE_KEY = 'toptan-ui-theme'
export const LOCALE_STORAGE_KEY = 'toptan-ui-locale'

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}

export function applyLocaleToDocument(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
}

export const useUiPreferences = create<UiPreferencesState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      locale: 'tr',
      setTheme: (theme) => {
        applyThemeToDocument(theme)
        try {
          localStorage.setItem(THEME_STORAGE_KEY, theme)
        } catch {
          /* ignore */
        }
        set({ theme })
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        get().setTheme(next)
      },
      setLocale: (locale) => {
        applyLocaleToDocument(locale)
        try {
          localStorage.setItem(LOCALE_STORAGE_KEY, locale)
          document.cookie = `toptan-locale=${locale};path=/;max-age=31536000;samesite=lax`
        } catch {
          /* ignore */
        }
        set({ locale })
      },
    }),
    {
      name: 'toptan-ui-preferences',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        applyThemeToDocument(state.theme)
        applyLocaleToDocument(state.locale)
        try {
          localStorage.setItem(THEME_STORAGE_KEY, state.theme)
          localStorage.setItem(LOCALE_STORAGE_KEY, state.locale)
        } catch {
          /* ignore */
        }
      },
    }
  )
)
