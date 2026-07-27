'use client'

import Link from 'next/link'
import { ShoppingCart, Phone, Mail, MapPin, CreditCard } from 'lucide-react'
import { getDictionary } from '@/lib/i18n'
import { useUiPreferences } from '@/lib/ui-preferences'
import styles from './Footer.module.css'

export default function Footer() {
  const locale = useUiPreferences((s) => s.locale)
  const dict = getDictionary(locale)
  const t = dict.footer

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerMain}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <div className={styles.brandLogoIcon}>
                <ShoppingCart size={22} />
              </div>
              TopTan Market
            </div>
            <p className={styles.brandDesc}>{t.desc}</p>
          </div>

          <div>
            <h4 className={styles.columnTitle}>{t.quickAccess}</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}><Link href="/">{t.home}</Link></li>
              <li className={styles.linkItem}><Link href="/kategoriler">{t.categories}</Link></li>
              <li className={styles.linkItem}><Link href="/kampanyalar">{dict.campaigns}</Link></li>
              <li className={styles.linkItem}><Link href="/hakkimizda">{dict.about}</Link></li>
              <li className={styles.linkItem}><Link href="/banka-hesaplari">{dict.bankAccounts}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className={styles.columnTitle}>{t.customerService}</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}><Link href="/hesabim">{t.myAccount}</Link></li>
              <li className={styles.linkItem}><Link href="/siparis-takip">{t.orderTracking}</Link></li>
              <li className={styles.linkItem}><Link href="/iade">{t.returns}</Link></li>
              <li className={styles.linkItem}><Link href="/sss">{t.faq}</Link></li>
              <li className={styles.linkItem}><Link href="/iletisim">{dict.contact}</Link></li>
              <li className={styles.linkItem}><Link href="/gizlilik">{t.privacy}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className={styles.columnTitle}>{t.contactTitle}</h4>
            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <Phone size={16} className={styles.contactIcon} />
                <div>
                  <div>0850 123 45 67</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t.hours}</div>
                </div>
              </li>
              <li className={styles.contactItem}>
                <Mail size={16} className={styles.contactIcon} />
                <span>destek@toptanmarket.com</span>
              </li>
              <li className={styles.contactItem}>
                <MapPin size={16} className={styles.contactIcon} />
                <span>Organize Sanayi Bölgesi, Ankara, Türkiye</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span className={styles.copyright}>
            &copy; {new Date().getFullYear()} TopTan Market. {t.rights}
          </span>
          <div className={styles.paymentMethods}>
            <span className={styles.paymentBadge}><CreditCard size={14} style={{ marginRight: 4 }} /> VISA</span>
            <span className={styles.paymentBadge}>MASTERCARD</span>
            <span className={styles.paymentBadge}>TROY</span>
            <span className={styles.paymentBadge}>HAVALE / EFT</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
