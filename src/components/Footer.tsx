import Link from 'next/link';
import { ShoppingCart, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerMain}>
          {/* Brand Column */}
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <div className={styles.brandLogoIcon}>
                <ShoppingCart size={22} />
              </div>
              TopTan Market
            </div>
            <p className={styles.brandDesc}>
              Bayilerimiz için özel fiyatlandırma, hızlı sipariş ve ERP entegrasyonlu 
              modern toptan satış platformu. Güvenli alışveriş, kolay ödeme.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={styles.columnTitle}>Hızlı Erişim</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}><Link href="/">Ana Sayfa</Link></li>
              <li className={styles.linkItem}><Link href="/kategoriler">Kategoriler</Link></li>
              <li className={styles.linkItem}><Link href="/kampanyalar">Kampanyalar</Link></li>
              <li className={styles.linkItem}><Link href="/hakkimizda">Hakkımızda</Link></li>
              <li className={styles.linkItem}><Link href="/banka-hesaplari">Banka Hesapları</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className={styles.columnTitle}>Müşteri Hizmetleri</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}><Link href="/siparis-takip">Sipariş Takibi</Link></li>
              <li className={styles.linkItem}><Link href="/iade">İade & Değişim</Link></li>
              <li className={styles.linkItem}><Link href="/sss">Sıkça Sorulan Sorular</Link></li>
              <li className={styles.linkItem}><Link href="/iletisim">İletişim</Link></li>
              <li className={styles.linkItem}><Link href="/gizlilik">Gizlilik Politikası</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={styles.columnTitle}>İletişim</h4>
            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <Phone size={16} className={styles.contactIcon} />
                <div>
                  <div>0850 123 45 67</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Hafta içi 09:00 - 18:00</div>
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

        {/* Bottom Bar */}
        <div className={styles.footerBottom}>
          <span className={styles.copyright}>
            &copy; {new Date().getFullYear()} TopTan Market. Tüm hakları saklıdır.
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
  );
}
