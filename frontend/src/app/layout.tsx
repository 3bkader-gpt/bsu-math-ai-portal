import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "بوابة قسم الرياضيات الذكية | جامعة بني سويف",
  description: "المنصة الأكاديمية الذكية لإنتاج وبث المحتوى الجامعي المعزز بالذكاء الاصطناعي",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${outfit.variable}`}>
      <body className="min-h-screen antialiased transition-colors duration-200 selection:bg-blue-500/20 selection:text-blue-700">
        {children}
      </body>
    </html>
  );
}
