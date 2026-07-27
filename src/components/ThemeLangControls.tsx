'use client'

import { Moon, Sun, Languages } from 'lucide-react'
import { getDictionary } from '@/lib/i18n'
import { useUiPreferences } from '@/lib/ui-preferences'
import styles from './Header.module.css'

export default function ThemeLangControls() {
  const theme = useUiPreferences((s) => s.theme)
  const locale = useUiPreferences((s) => s.locale)
  const toggleTheme = useUiPreferences((s) => s.toggleTheme)
  const setLocale = useUiPreferences((s) => s.setLocale)
  const t = getDictionary(locale)

  return (
    <div className={styles.prefControls} suppressHydrationWarning>
      <button
        type="button"
        className={styles.prefButton}
        onClick={toggleTheme}
        aria-label={theme === 'light' ? t.themeDark : t.themeLight}
        title={theme === 'light' ? t.themeDark : t.themeLight}
      >
        {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        <span className={styles.prefLabel}>
          {theme === 'light' ? t.themeShortDark : t.themeShortLight}
        </span>
      </button>

      <div className={styles.prefDivider} aria-hidden />

      <div className={styles.langGroup} role="group" aria-label="Language">
        <Languages size={14} className={styles.langIcon} aria-hidden />
        <button
          type="button"
          className={`${styles.langBtn} ${locale === 'tr' ? styles.langBtnActive : ''}`}
          onClick={() => setLocale('tr')}
          aria-pressed={locale === 'tr'}
        >
          TR
        </button>
        <button
          type="button"
          className={`${styles.langBtn} ${locale === 'en' ? styles.langBtnActive : ''}`}
          onClick={() => setLocale('en')}
          aria-pressed={locale === 'en'}
        >
          EN
        </button>
      </div>
    </div>
  )
}
