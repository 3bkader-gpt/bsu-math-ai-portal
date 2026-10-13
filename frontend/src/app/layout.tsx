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
  title: "بوابة الرياضيات والذكاء الاصطناعي | كلية التربية جامعة بني سويف",
  description: "المنصة الأكاديمية المزدوجة لشعبة رياضيات - الفرقة الثانية، كلية التربية (عام) جامعة بني سويف",
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
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var persona = localStorage.getItem('bsu_portal_persona') || 'boys';
                  var mode = localStorage.getItem('bsu_portal_mode');
                  if (!mode) {
                    var oldTheme = localStorage.getItem('bsu_math_theme');
                    mode = oldTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  }
                  document.documentElement.setAttribute('data-persona', persona);
                  document.documentElement.setAttribute('data-mode', mode);
                  if (mode === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
