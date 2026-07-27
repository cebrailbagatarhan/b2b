'use client'

import { getDictionary, type Dictionary, type Locale } from '@/lib/i18n'
import { useUiPreferences } from '@/lib/ui-preferences'

export function useLocale(): Locale {
  return useUiPreferences((s) => s.locale)
}

export function useT(): Dictionary {
  const locale = useLocale()
  return getDictionary(locale)
}
