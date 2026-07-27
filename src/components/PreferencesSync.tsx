'use client'

import { useEffect } from 'react'
import {
  applyLocaleToDocument,
  applyThemeToDocument,
  useUiPreferences,
} from '@/lib/ui-preferences'

/** Keeps <html> attributes in sync after hydration / preference changes. */
export default function PreferencesSync() {
  const theme = useUiPreferences((s) => s.theme)
  const locale = useUiPreferences((s) => s.locale)

  useEffect(() => {
    applyThemeToDocument(theme)
    applyLocaleToDocument(locale)
  }, [theme, locale])

  return null
}
