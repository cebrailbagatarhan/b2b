import type { Metadata } from "next";
import "./globals.css";
import AuthSessionSync from "@/components/AuthSessionSync";
import PreferencesSync from "@/components/PreferencesSync";
import SiteChrome from "@/components/SiteChrome";
import ThemeScript from "@/components/ThemeScript";

export const metadata: Metadata = {
  title: "TopTan Market | Toptan Satış Platformu",
  description: "Toptan satış için özel fiyatlandırma, hızlı sipariş ve ERP entegrasyonlu modern e-ticaret platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <AuthSessionSync />
        <PreferencesSync />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
